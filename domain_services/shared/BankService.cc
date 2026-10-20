#include "BankService.h"
#include "utils/TransactionUtil.h"
#include <regex>
#include <algorithm>
#include <cstdint>
namespace business_desk::domain_services {
namespace {
using drogon::orm::DbClientPtr;
dto::BaseApiResponse fail(const char* code, const char* message) {
    dto::BaseApiResponse r; r.error["code"]=code; r.error["message"]=message; return r;
}
bool uuid(const std::string& value) {
    static const std::regex pattern("^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$");
    return std::regex_match(value,pattern);
}
std::string trim(const std::string& s) {
    auto a=s.find_first_not_of(" \t\r\n"), b=s.find_last_not_of(" \t\r\n");
    return a==std::string::npos ? "" : s.substr(a,b-a+1);
}
bool validate(Json::Value& body, bool branch) {
    if(!body.isObject()) return false;
    for(const auto& key:body.getMemberNames())
        if(key!="name" && key!="contactPerson" && key!="contactNo" && key!="email" && (branch || key!="bankCode")) return false;
    for(const auto& key: {"name","contactPerson","contactNo","email","bankCode"}) {
        if(branch && std::string(key)=="bankCode") continue;
        const bool required=std::string(key)=="name" || std::string(key)=="bankCode";
        if(!body.isMember(key) && !required) body[key]="";
        if(!body[key].isString()) return false;
        auto text=trim(body[key].asString());
        size_t max=std::string(key)=="email"?254:std::string(key)=="contactNo"?50:std::string(key)=="bankCode"?40:160;
        if(text.size()>max || (required && text.empty()) || text.find('\0')!=std::string::npos) return false;
        body[key]=text;
    }
    const auto email=body["email"].asString();
    if(!email.empty() && !std::regex_match(email,std::regex(R"(^[^\s@]+@[^\s@]+\.[^\s@]+$)"))) return false;
    return true;
}
Json::Value record(const drogon::orm::Row& row, bool branch) {
    Json::Value r;
    for(const auto& key:{"id","name","email"}) r[key]=row[key].as<std::string>();
    r["contactPerson"]=row["contact_person"].as<std::string>();
    r["contactNo"]=row["contact_no"].as<std::string>();
    if(branch) r["bankId"]=row["bank_id"].as<std::string>();
    else r["bankCode"]=row["bank_code"].as<std::string>();
    return r;
}
// All dynamic SQL fragments below are internal constants, never request values.
drogon::Task<dto::BaseApiResponse> run(DbClientPtr db, std::string op, bool branch,
    std::string bankId, std::string id, Json::Value body, int page, int size,
    std::string query, utils::AuditIdentity who) {
    const bool write=op=="create"||op=="update"||op=="delete";
    // Lock parent first for every branch mutation: bank deletion and branch writes serialize.
    if(branch) {
        const std::string sql="SELECT id FROM core_banks WHERE tenant_id=$1 AND id=$2 AND is_deleted=false" + std::string(write?" FOR UPDATE":"");
        auto parents=co_await db->execSqlCoro(sql,who.tenantId,bankId);
        if(parents.empty()) co_return fail("not_found","Bank not found.");
    }
    const std::string table=branch?"core_bank_branches":"core_banks";
    const std::string scope="tenant_id=$1 AND is_deleted=false" + std::string(branch?" AND bank_id=$2":" AND $2::uuid IS NOT NULL");
    const std::string parent=branch?bankId:who.tenantId;
    dto::BaseApiResponse r;
    if(op=="list") {
        const std::string search=" AND (strpos(lower(name),lower($3))>0"+std::string(branch?"":" OR strpos(lower(bank_code),lower($3))>0")+")";
        const auto counts=co_await db->execSqlCoro("SELECT count(*) AS total FROM "+table+" WHERE "+scope+search,who.tenantId,parent,query);
        // PostgreSQL infers LIMIT/OFFSET parameters as int8. Drogon sends integers
        // in binary at their C++ width; int32 binds here cause SQLSTATE 22P03.
        const int64_t limit=size;
        const int64_t offset=(static_cast<int64_t>(page)-1)*limit;
        const auto rows=co_await db->execSqlCoro("SELECT * FROM "+table+" WHERE "+scope+search+" ORDER BY lower(name),id LIMIT $4::bigint OFFSET $5::bigint",who.tenantId,parent,query,limit,offset);
        r.result["data"]=Json::Value(Json::arrayValue);
        for(const auto& row:rows) r.result["data"].append(record(row,branch));
        auto total=counts[0]["total"].as<int64_t>();
        r.result["totalCount"]=Json::Int64(total); r.result["pageNo"]=page; r.result["pageSize"]=size;
        r.result["totalPages"]=Json::Int64((total+size-1)/size);
    } else if(op=="create") {
        std::string sql="INSERT INTO "+table+" (tenant_id,name,contact_person,contact_no,email,created_by_user_id,"+std::string(branch?"bank_id":"bank_code")+") VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *";
        const std::string last=branch?bankId:body["bankCode"].asString();
        auto rows=co_await db->execSqlCoro(sql,who.tenantId,body["name"].asString(),body["contactPerson"].asString(),body["contactNo"].asString(),body["email"].asString(),who.userId,last);
        r.result=record(rows[0],branch);
    } else {
        auto rows=co_await db->execSqlCoro("SELECT * FROM "+table+" WHERE "+scope+" AND id=$3"+std::string(write?" FOR UPDATE":""),who.tenantId,parent,id);
        if(rows.empty()) co_return fail("not_found","Record not found.");
        if(op=="get") r.result=record(rows[0],branch);
        else if(op=="update") {
            const std::string extra=branch?"":" ,bank_code=$9";
            // Use the same parameter count for both shapes, avoiding untyped unused binds.
            const std::string tail=branch?" AND $9::text IS NOT NULL":"";
            // Keep conditional string arguments outside co_await (GCC 12 coroutine workaround).
            const std::string code=branch?std::string{}:body["bankCode"].asString();
            auto updated=co_await db->execSqlCoro("UPDATE "+table+" SET name=$4,contact_person=$5,contact_no=$6,email=$7,last_modified_at=now(),last_modified_by_user_id=$8"+extra+" WHERE "+scope+" AND id=$3"+tail+" RETURNING *",who.tenantId,parent,id,body["name"].asString(),body["contactPerson"].asString(),body["contactNo"].asString(),body["email"].asString(),who.userId,code);
            r.result=record(updated[0],branch);
        } else {
            const std::string referenceSql="SELECT id FROM gl_bank_accounts WHERE tenant_id=$1 AND is_deleted=false AND "+std::string(branch?"bank_branch_id=$2":"(bank_id=$2 OR bank_branch_id IN (SELECT id FROM core_bank_branches WHERE tenant_id=$1 AND bank_id=$2 AND is_deleted=false))")+" LIMIT 1";
            auto used=co_await db->execSqlCoro(referenceSql,who.tenantId,id);
            if(!used.empty())co_return fail("conflict","Bank accounts reference this bank or branch.");
            if(!branch) co_await db->execSqlCoro("UPDATE core_bank_branches SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$3,last_modified_at=now(),last_modified_by_user_id=$3 WHERE tenant_id=$1 AND bank_id=$2 AND is_deleted=false",who.tenantId,id,who.userId);
            co_await db->execSqlCoro("UPDATE "+table+" SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$4,last_modified_at=now(),last_modified_by_user_id=$4 WHERE "+scope+" AND id=$3",who.tenantId,parent,id,who.userId);
            r.result["id"]=id; r.result["isDeleted"]=true;
        }
    }
    r.success=true; co_return r;
}
}
drogon::Task<dto::BaseApiResponse> BankService::execute(std::string op,bool branch,std::string bankId,std::string id,Json::Value body,int page,int size,std::string query,utils::AuditIdentity who) {
    if(!uuid(who.tenantId)||!uuid(who.userId)) co_return fail("unauthorized","Tenant authentication required.");
    if((branch&&!uuid(bankId)) || (op!="list"&&op!="create"&&!uuid(id))) co_return fail("validation_error","Invalid identifier.");
    if(op!="list"&&op!="get"&&op!="create"&&op!="update"&&op!="delete") co_return fail("validation_error","Invalid operation.");
    if(page<1||page>1000000||size<1||size>200||query.size()>160) co_return fail("validation_error","Invalid list parameters.");
    if((op=="create"||op=="update")&&!validate(body,branch)) co_return fail("validation_error","Check bank or branch fields.");
    try {
        auto db=drogon::app().getDbClient();
        if(op=="list"||op=="get") co_return co_await run(db,op,branch,bankId,id,body,page,size,query,who);
        auto tx=co_await db->newTransactionCoro();
        auto result=co_await run(tx,op,branch,bankId,id,body,page,size,query,who);
        if(!result.success){tx->rollback();co_return result;}
        if(!(co_await utils::CommitTransaction{std::move(tx)})) co_return fail("database_error","Unable to commit bank changes.");
        co_return result;
    } catch(const drogon::orm::UniqueViolation&) {co_return fail("conflict","Bank code already exists.");}
      catch(const std::exception&) {co_return fail("database_error","Bank service unavailable.");}
}
}
