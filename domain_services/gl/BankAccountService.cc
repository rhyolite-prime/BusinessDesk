#include "BankAccountService.h"
#include "dto/BankAccountFields.h"
#include "utils/TransactionUtil.h"
#include <regex>
#include <chrono>
#include <cctype>
namespace business_desk::domain_services {
namespace {
using namespace drogon::orm;
using dto::bank_account::fields;
dto::BaseApiResponse fail(const char* code,const char* message){dto::BaseApiResponse r;r.error["code"]=code;r.error["message"]=message;return r;}
bool uuid(const std::string& s){static const std::regex p("^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$");return std::regex_match(s,p)&&s!="00000000-0000-0000-0000-000000000000";}
std::string lower(std::string s){for(auto& c:s)c=static_cast<char>(std::tolower(static_cast<unsigned char>(c)));return s;}
std::string trim(std::string s){auto a=s.find_first_not_of(" \t\r\n"),z=s.find_last_not_of(" \t\r\n");return a==std::string::npos?"":s.substr(a,z-a+1);}
bool known(const std::string& k){if(k=="accountingUnitId")return true;for(auto& f:fields)if(k==f.name)return true;return false;}
bool date(const std::string& s){if(!std::regex_match(s,std::regex("^[0-9]{4}-[0-9]{2}-[0-9]{2}$")))return false;int y=std::stoi(s.substr(0,4)),m=std::stoi(s.substr(5,2)),d=std::stoi(s.substr(8,2));return y>=1&&std::chrono::year_month_day{std::chrono::year(y),std::chrono::month(m),std::chrono::day(d)}.ok();}
bool valid(Json::Value& b){
 for(auto& f:fields){auto& v=b[f.name];const std::string type=f.type;
  if(type=="boolean"){if(!v.isBool())return false;continue;}
  if(!v.isString())return false;auto s=trim(v.asString());if(s.find('\0')!=std::string::npos)return false;
  if(type=="uuid"){if(!uuid(s))return false;s=lower(s);}else if(type=="date"){if(!date(s))return false;}
  else if(s.size()>static_cast<size_t>(f.limit))return false;v=s;
 }
 return !b["accountNumber"].asString().empty()&&!b["accountType"].asString().empty();
}
std::string projection(){
 std::string s="jsonb_build_object('id',b.id,'accountingUnitId',b.accounting_unit_id,'bankName',COALESCE(b.bank_name,''),'bankBranchName',COALESCE(b.bank_branch_name,''),'accountName',COALESCE(b.account_name,''),'currencyName',(SELECT name FROM core_currencies WHERE id=b.currency_id AND is_deleted=false),'currencyCode',(SELECT code FROM core_currencies WHERE id=b.currency_id AND is_deleted=false)";
 for(auto& f:fields){const std::string value="b."+std::string(f.column);s+=",'"+std::string(f.name)+"',"+(f.limit>0?"COALESCE("+value+",'')":value);}return s+") AS record";
}
Json::Value decode(const Row& row){Json::Value b;Json::Reader reader;if(!reader.parse(row["record"].as<std::string>(),b))throw std::runtime_error("Invalid bank account");return b;}
drogon::Task<bool> inUse(DbClientPtr db,std::string tenant,std::string unit,std::string id){
 auto refs=co_await db->execSqlCoro("SELECT id FROM gl_default_accounts WHERE tenant_id=$1 AND accounting_unit_id=$2 AND is_deleted=false AND ($3::uuid IN (accounts_payables_bank_account_id,payroll_bank_account_id,sales_bank_account_id,accounts_receivable_bank_account_id,purchases_bank_account_id)) UNION ALL SELECT id FROM gl_payment_vouchers WHERE tenant_id=$1 AND accounting_unit_id=$2 AND bank_account_id=$3 AND is_deleted=false UNION ALL SELECT id FROM gl_cash_receipts WHERE tenant_id=$1 AND accounting_unit_id=$2 AND cash_bank_account_id=$3 AND is_deleted=false UNION ALL SELECT id FROM gl_bank_reconciliations WHERE tenant_id=$1 AND accounting_unit_id=$2 AND bank_account_id=$3 LIMIT 1",tenant,unit,id);
 co_return !refs.empty();
}
drogon::Task<dto::BaseApiResponse> run(DbClientPtr db,std::string op,std::string id,std::string unit,Json::Value input,utils::AuditIdentity who){
 const bool write=op=="create"||op=="update"||op=="delete";
 const std::string usql="SELECT id FROM core_accounting_units WHERE tenant_id=$1 AND id=$2 AND is_deleted=false AND is_active=true"+std::string(write?" FOR UPDATE":"");
 auto units=co_await db->execSqlCoro(usql,who.tenantId,unit);if(units.empty())co_return fail("not_found","Active accounting unit not found.");
 dto::BaseApiResponse r;
 if(op=="options"){
  auto banks=co_await db->execSqlCoro("SELECT id,name FROM core_banks WHERE tenant_id=$1 AND is_deleted=false AND octet_length(name)<=100 ORDER BY lower(name),id",who.tenantId);
  auto branches=co_await db->execSqlCoro("SELECT c.id,c.name,c.bank_id FROM core_bank_branches c JOIN core_banks b ON b.id=c.bank_id AND b.tenant_id=c.tenant_id WHERE c.tenant_id=$1 AND c.is_deleted=false AND b.is_deleted=false AND octet_length(c.name)<=100 AND octet_length(b.name)<=100 ORDER BY lower(c.name),c.id",who.tenantId);
  auto accounts=co_await db->execSqlCoro("SELECT id,account_name AS name,account_number,currency_id FROM gl_accounts WHERE tenant_id=$1 AND accounting_unit_id=$2 AND is_deleted=false AND status='active' AND octet_length(account_name)<=150 ORDER BY account_number,id",who.tenantId,unit);
  auto currencies=co_await db->execSqlCoro("SELECT id,name,code FROM core_currencies WHERE is_deleted=false AND is_active=true ORDER BY code,id");
  auto add=[&](const char* key,const auto& rows){r.result[key]=Json::arrayValue;for(auto& row:rows){Json::Value v;v["id"]=row["id"].template as<std::string>();v["name"]=row["name"].template as<std::string>();if(std::string(key)=="branches")v["bankId"]=row["bank_id"].template as<std::string>();if(std::string(key)=="accounts"){v["accountNumber"]=row["account_number"].template as<std::string>();v["currencyId"]=row["currency_id"].template as<std::string>();}if(std::string(key)=="currencies")v["code"]=row["code"].template as<std::string>();r.result[key].append(v);}};
  add("banks",banks);add("branches",branches);add("accounts",accounts);add("currencies",currencies);r.success=true;co_return r;
 }
 const std::string select="SELECT "+projection()+" FROM gl_bank_accounts b WHERE b.tenant_id=$1 AND b.accounting_unit_id=$2 AND b.is_deleted=false";
 if(op=="list"){
  auto rows=co_await db->execSqlCoro(select+" ORDER BY lower(b.bank_name),b.account_number,b.id",who.tenantId,unit);
  r.result["data"]=Json::arrayValue;for(auto& row:rows)r.result["data"].append(decode(row));r.result["totalCount"]=Json::UInt64(rows.size());r.success=true;co_return r;
 }
 Json::Value current;
 if(op!="create"){
  const std::string sql=select+" AND b.id=$3"+std::string(write?" FOR UPDATE OF b":"");auto rows=co_await db->execSqlCoro(sql,who.tenantId,unit,id);
  if(rows.empty())co_return fail("not_found","Bank account not found.");current=decode(rows[0]);
  if(op=="get"){r.success=true;r.result=current;co_return r;}
 }
 if(op=="delete"){
  if(co_await inUse(db,who.tenantId,unit,id))co_return fail("conflict","Default GL or financial activity prevents deletion.");
  co_await db->execSqlCoro("UPDATE gl_bank_accounts SET is_deleted=true,is_active=false,deleted_at=now(),deleted_by_user_id=$4,last_modified_at=now(),last_modified_by_user_id=$4 WHERE tenant_id=$1 AND accounting_unit_id=$2 AND id=$3 AND is_deleted=false",who.tenantId,unit,id,who.userId);
  r.result["id"]=id;r.result["isDeleted"]=true;r.success=true;co_return r;
 }
 Json::Value body;for(auto& f:fields)body[f.name]=current.isNull()?(std::string(f.type)=="boolean"?Json::Value(true):Json::Value("")):current[f.name];
 for(auto& k:input.getMemberNames())if(k!="accountingUnitId")body[k]=input[k];if(!valid(body))co_return fail("validation_error","Check bank account fields, UUIDs, lengths and opening date.");
 if(op=="update"){
  bool changed=false;for(auto& k:{"bankId","bankBranchId","accountId","currencyId","accountNumber"})if(body[k]!=current[k])changed=true;
  if(!body["isActive"].asBool()&&current["isActive"].asBool())changed=true;
  if(changed&&(co_await inUse(db,who.tenantId,unit,id)))co_return fail("conflict","Used bank accounts cannot change identity, backing GL, currency or be deactivated.");
 }
 const std::string bankId=body["bankId"].asString(),branchId=body["bankBranchId"].asString(),accountId=body["accountId"].asString(),currencyId=body["currencyId"].asString();
 auto banks=co_await db->execSqlCoro("SELECT name FROM core_banks WHERE tenant_id=$1 AND id=$2 AND is_deleted=false FOR UPDATE",who.tenantId,bankId);
 auto branches=co_await db->execSqlCoro("SELECT name FROM core_bank_branches WHERE tenant_id=$1 AND bank_id=$2 AND id=$3 AND is_deleted=false FOR UPDATE",who.tenantId,bankId,branchId);
 auto accounts=co_await db->execSqlCoro("SELECT account_name,currency_id FROM gl_accounts WHERE tenant_id=$1 AND accounting_unit_id=$2 AND id=$3 AND is_deleted=false AND status='active' FOR UPDATE",who.tenantId,unit,accountId);
 auto currencies=co_await db->execSqlCoro("SELECT id FROM core_currencies WHERE id=$1 AND is_deleted=false AND is_active=true FOR UPDATE",currencyId);
 if(banks.empty()||branches.empty()||accounts.empty()||currencies.empty())co_return fail("validation_error","Select live bank/branch and active GL/currency references in scope.");
 const auto glCurrency=accounts[0]["currency_id"].as<std::string>();if(!glCurrency.empty()&&lower(glCurrency)!=currencyId)co_return fail("validation_error","Currency must match the linked GL account's explicit currency.");
 const std::string bankName=banks[0]["name"].as<std::string>(),branchName=branches[0]["name"].as<std::string>(),accountName=accounts[0]["account_name"].as<std::string>();
 if(bankName.size()>100||branchName.size()>100||accountName.size()>150)co_return fail("validation_error","Selected names exceed bank-account model limits.");
 const std::string excludeId=op=="create"?"00000000-0000-0000-0000-000000000000":id;
 auto duplicates=co_await db->execSqlCoro("SELECT id FROM gl_bank_accounts WHERE tenant_id=$1 AND accounting_unit_id=$2 AND is_deleted=false AND lower(btrim(account_number))=lower($3) AND id<>NULLIF($4,'')::uuid",who.tenantId,unit,body["accountNumber"].asString(),excludeId);
 if(!duplicates.empty())co_return fail("conflict","Account number already exists in this accounting unit.");
 // Internal-only metadata supplies SQL identifiers; all data is bound.
 body["bankName"]=bankName;body["bankBranchName"]=branchName;body["accountName"]=accountName;
 const std::string payload=Json::FastWriter().write(body);std::string sql;
 if(op=="create"){
  std::string columns="tenant_id,accounting_unit_id,created_by_user_id,bank_name,bank_branch_name,account_name",values="$1::uuid,$2::uuid,$4::uuid,$3::jsonb->>'bankName',$3::jsonb->>'bankBranchName',$3::jsonb->>'accountName'";
  for(auto& f:fields){columns+=","+std::string(f.column);values+=",($3::jsonb->>'"+std::string(f.name)+"')::"+f.type;}
  sql="INSERT INTO gl_bank_accounts AS b ("+columns+") VALUES ("+values+") RETURNING "+projection();
 }else{
  sql="UPDATE gl_bank_accounts AS b SET last_modified_at=now(),last_modified_by_user_id=$4,bank_name=$3::jsonb->>'bankName',bank_branch_name=$3::jsonb->>'bankBranchName',account_name=$3::jsonb->>'accountName'";
  for(auto& f:fields)sql+=","+std::string(f.column)+"=($3::jsonb->>'"+f.name+"')::"+f.type;
  sql+=" WHERE tenant_id=$1 AND accounting_unit_id=$2 AND id=$5 AND is_deleted=false RETURNING "+projection();
 }
 // Keep binding shapes stable; never pass a conditional temporary through co_await.
 if(op=="create"){auto rows=co_await db->execSqlCoro(sql,who.tenantId,unit,payload,who.userId);r.result=decode(rows[0]);}
 else{auto rows=co_await db->execSqlCoro(sql,who.tenantId,unit,payload,who.userId,id);r.result=decode(rows[0]);}
 r.success=true;co_return r;
}
}
drogon::Task<dto::BaseApiResponse> BankAccountService::execute(std::string op,std::string id,std::string unit,Json::Value body,utils::AuditIdentity who){
 if(!uuid(who.tenantId)||!uuid(who.userId))co_return fail("unauthorized","Tenant authentication required.");
 if(op!="list"&&op!="get"&&op!="options"&&op!="create"&&op!="update"&&op!="delete")co_return fail("validation_error","Invalid operation.");
 if(!uuid(unit)||((op=="get"||op=="update"||op=="delete")&&!uuid(id)))co_return fail("validation_error","Valid unit and record UUIDs required.");
 if(op=="create"||op=="update"){
  if(!body.isObject())co_return fail("validation_error","Bank account object required.");
  for(auto& pair:{std::pair{"accountNo","accountNumber"},std::pair{"contactNo","contactNumber"}})if(body.isMember(pair.first)){if(body.isMember(pair.second))co_return fail("validation_error","Specify one field spelling.");body[pair.second]=body[pair.first];body.removeMember(pair.first);}
  for(auto& k:body.getMemberNames())if(!known(k))co_return fail("validation_error","Unexpected bank account field.");
  if(!body["accountingUnitId"].isString()||lower(body["accountingUnitId"].asString())!=lower(unit))co_return fail("validation_error","Unit scope mismatch.");
 }
 try{
  auto db=drogon::app().getDbClient();if(op=="list"||op=="get"||op=="options")co_return co_await run(db,op,id,unit,body,who);
  auto tx=co_await db->newTransactionCoro();auto r=co_await run(tx,op,id,unit,body,who);if(!r.success){tx->rollback();co_return r;}
  if(!(co_await utils::CommitTransaction{std::move(tx)}))co_return fail("database_error","Unable to commit bank account.");co_return r;
 }catch(const UniqueViolation&){co_return fail("conflict","Account number already reserved in this accounting unit.");}
 catch(const std::exception&){co_return fail("database_error","Bank account service unavailable.");}
}
}
