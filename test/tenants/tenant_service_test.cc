// HTTP/ORM seams, real bcrypt/OpenSSL, plus separate real PostgreSQL SQL tests.
#include "domain_services/tenants/TenantService.h"
#include "domain_services/tenants/TenantSql.h"
#include "controllers/TenantController.h"
#include "constants/TenantConstants.h"
#include "Tenants.h"
#include <drogon/orm/CoroMapper.h>
#include <bcrypt.h>
#include <iostream>
#include <unordered_set>
using namespace business_desk;
using namespace drogon::orm;
using drogon_model::BusinessDesk::Tenants;
int checks=0;
void check(bool ok,const char *name) { ++checks; if(!ok) {std::cerr<<"FAIL: "<<name<<"\n"; std::exit(1);} }
int main() {
 domain_services::TenantService service;
 utils::AuditIdentity host{"","00000000-0000-4000-8000-000000000002"}, tenantCaller{"tenant-a","user"};
 const std::string id="10000000-0000-4000-8000-000000000001";
 Json::Value payload; payload["tenancyName"]="RhyolitePrimeLtd"; payload["name"]="RhyolitePrimeLtd";
 payload["adminEmailAddress"]="kwabenaimhotep@gmail.com"; payload["connectionString"]=Json::nullValue;
 payload["defaultCurrencyId"]="40000000-0000-4000-8000-000000000001";
 dto::TenantDto input; input.fromJson(payload);
 check(input.getAdminEmailAddress()=="kwabenaimhotep@gmail.com" && input.getConnectionString().empty(),"payload fields independent");
 check(input.hasConnectionString(),"explicit null connection presence");
 input.setConnectionString("db-secret"); check(input.getAdminEmailAddress()=="kwabenaimhotep@gmail.com","connection setter preserves email"); input.fromJson(payload);
 dto::TenantDto omitted; Json::Value partial; partial["name"]="Renamed"; omitted.fromJson(partial);
 check(!omitted.hasConnectionString() && !omitted.hasTenancyName(),"partial DTO presence");
 check(!service.createTenant(input,{}).get().success,"anonymous create denied");
 check(!service.createTenant(input,tenantCaller).get().success,"tenant create denied");
 check(!service.getAllTenants(1,20,"",tenantCaller).get().success,"tenant list denied");
 check(!service.createTenant(dto::TenantDto{},host).get().success,"required create fields");
 auto invalid=input; invalid.setTenancyName("bad name"); check(!service.createTenant(invalid,host).get().success,"invalid tenancy name");
 invalid=input; invalid.setTenancyName("HOST"); check(!service.createTenant(invalid,host).get().success,"reserved name");
 invalid=input; invalid.setAdminEmailAddress("bad-email"); check(!service.createTenant(invalid,host).get().success,"invalid email");
 invalid=input; invalid.setConnectionString(std::string(1025,'x')); check(!service.createTenant(invalid,host).get().success,"connection length");
 invalid=input;invalid.setDefaultCurrencyId("");check(!service.createTenant(invalid,host).get().success,"default currency required");
 invalid=input;invalid.setDefaultCurrencyId("not-a-uuid");check(!service.createTenant(invalid,host).get().success,"currency UUID validated");
 Json::Value permission; permission["systemName"]="ledger.read";
 drogon::app().config["AdminPermissions"]=Json::arrayValue; drogon::app().config["AdminPermissions"].append(permission);
 std::vector<Json::Value> createParams,updateParams;
 auto db=drogon::app().getDbClient();
 db->execute=[&](const std::string &sql,const std::vector<Json::Value> &params) {
  drogon::TestResult rows;
  if(sql==domain_services::tenant_sql::create) {
   createParams=params;
   Json::Value row; row["tenant_id"]=id; row["tenancy_name"]=params[0]; row["name"]=params[1]; row["admin_user_id"]="new-admin";
   rows.push_back({row});
  } else if(sql==domain_services::tenant_sql::update) {
   updateParams=params;
   Json::Value row; row["id"]=id; row["tenancy_name"]="RhyolitePrimeLtd"; row["name"]="Renamed"; row["is_active"]=true; rows.push_back({row});
  }
  return rows;
 };
 auto created=service.createTenant(input,host).get(); check(created.success,"provisioning success response");
 check(createParams.size()==8 && createParams[4].asString()=="kwabenaimhotep@gmail.com","email passed separately");
 check(createParams[7].asString()==payload["defaultCurrencyId"].asString(),"default currency passed to atomic provisioning");
 check(createParams[3].asString()==host.userId,"host provisioning actor");
 check(created.result["temporaryPassword"].asString().size()==24,"strong generated password");
 check(bcrypt::validatePassword(created.result["temporaryPassword"].asString(),createParams[6].asString()),"bcrypt password roundtrip");
 check(createParams[6].asString()!=created.result["temporaryPassword"].asString(),"only hash persisted");
 check(createParams[5].asString().find("ledger.read")!=std::string::npos,"configured tenant permissions used");
 check(!created.result.isMember("connectionString") && !created.result.isMember("passwordHash"),"creation redacts secrets");
 auto password=created.result["temporaryPassword"].asString();
 auto again=service.createTenant(input,host).get(); check(again.result["temporaryPassword"].asString()!=password,"password differs per tenant creation");
 CoroMapper<Tenants> mapper(0);
 Tenants row; row.setId(id); row.setTenancyName("RhyolitePrimeLtd"); row.setName("RhyolitePrimeLtd"); row.setIsDeleted(false); row.setIsActive(true); row.setConnectionString("secret-db");
 utils::applyCreateAudit(row,host); mapper.insert(row).get();
 check(row.getValueOfCreatorUserId()==host.userId && !row.toJson()["creation_time"].isNull(),"legacy tenant creation audit utility");
 auto got=service.getTenant(id,host).get(); check(got.success && !got.result.isMember("connection_string") && !got.result.isMember("connectionString"),"get redacts connection");
 auto listed=service.getAllTenants(0,0,"",host).get(); check(listed.success && listed.result["pageSize"].asInt()==1,"tenant pagination normalization");
 check(service.getAllTenants(999,20,"",host).get().result["upperBound"].asUInt64()==0,"empty page bounds");
 check(!service.getTenant("not-uuid",host).get().success,"invalid tenant id");
 check(service.updateTenant(omitted,id,host).get().success,"partial tenant update");
 check(!updateParams[1].asBool() && updateParams[3].asBool() && !updateParams[5].asBool(),"update preserves omitted fields");
 check(!service.updateTenant(input,constants::kHostTenantId,host).get().success,"protected host update");
 check(!service.deActivateTenant(constants::kHostTenantId,host).get().success,"protected host deactivate");
 check(!service.activateTenant(constants::kHostTenantId,host).get().success,"protected host activation");
 check(!service.deleteTenant(constants::kHostTenantId,host).get().success,"protected host deletion");
 check(service.deActivateTenant(id,host).get().success,"deactivate tenant");
 auto stored=mapper.findByPrimaryKey(id).get();
 check(!stored.getValueOfIsActive() && !stored.getValueOfIsDeleted(),"deactivation not deletion");
 check(stored.getValueOfLastModifierUserId()==host.userId,"status actor audit");
 check(!stored.toJson()["last_modification_time"].isNull(),"status timestamp audit");
 check(service.activateTenant(id,host).get().success,"activate tenant");
 // Controller dispatch: test authorization, input validation and response mapping.
 TenantController controller;
 auto request=std::make_shared<drogon::HttpRequest>();
 check(controller.list(request).get()->status==403,"controller denies no identity");
 request->attributes()->insert("hostUserId",host.userId);
 request->attributes()->insert("permissions",std::unordered_set<std::string>{});
 check(controller.list(request).get()->status==403,"controller requires permission");
 request->attributes()->insert("permissions",std::unordered_set<std::string>{"tenants.manage"});
 check(controller.list(request).get()->status==200,"controller list");
 request->parameters["pageNo"]="bad"; check(controller.list(request).get()->status==400,"controller invalid page"); request->parameters.clear();
 request->json=std::make_shared<Json::Value>(payload); (*request->json)["connectionString"]=42;
 check(controller.create(request).get()->status==400,"controller validates JSON types");
 request->json=std::make_shared<Json::Value>(payload);
 auto response=controller.create(request).get(); check(response->status==201 && response->headers["Cache-Control"]=="no-store","controller creation and no-store");
 request->method=drogon::Options; check(controller.create(request).get()->status==204,"OPTIONS handled without token"); request->method=drogon::Get;
 check(controller.update(request,constants::kHostTenantId).get()->status==403,"controller protects host");
 check(controller.deactivate(request,id).get()->status==200,"controller deactivate");
 check(controller.activate(request,id).get()->status==200,"controller activate");
 check(controller.get(request,id).get()->status==200,"controller get");
 check(controller.remove(request,id).get()->status==200,"controller delete");
 stored=mapper.findByPrimaryKey(id).get();
 check(stored.getValueOfIsDeleted() && !stored.getValueOfIsActive(),"soft delete flags");
 check(stored.getValueOfDeleterUserId()==host.userId && !stored.toJson()["deletion_time"].isNull(),"tenant delete auditing");
 check(!service.getTenant(id,host).get().success,"deleted tenant hidden");
 check(service.getAllTenants(1,20,"",host).get().result["totalCount"].asUInt64()==0,"deleted tenant absent in count");
 check(!service.updateTenant(input,id,host).get().success,"deleted tenant cannot update");
 check(!service.activateTenant(id,host).get().success,"deleted tenant cannot activate");
 check(!service.deActivateTenant(id,host).get().success,"deleted tenant cannot deactivate");
 check(!service.deleteTenant(id,host).get().success,"deleted tenant cannot delete twice");
 check(controller.get(request,id).get()->status==404,"controller maps not found");
 db->execute=[](const auto &,const auto &)->drogon::TestResult {throw UniqueViolation("test duplicate");};
 check(service.createTenant(input,host).get().error["code"].asString()=="conflict","unique constraint failure maps conflict");
 db->execute=[](const auto &,const auto &)->drogon::TestResult {throw DrogonDbException("test failure");};
 check(!service.createTenant(input,host).get().success,"DB failure returns no success or password");
 std::cout<<checks<<" tenant service/controller checks passed\n";
}
