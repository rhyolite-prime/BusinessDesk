#include "BankAccountController.h"
#include "domain_services/gl/BankAccountService.h"
namespace {
drogon::Task<drogon::HttpResponsePtr> handle(drogon::HttpRequestPtr req,std::string op,std::string id){
    if(req->getMethod()==drogon::Options){auto r=drogon::HttpResponse::newHttpResponse();r->setStatusCode(drogon::k204NoContent);co_return r;}
    Json::Value body;if(req->getJsonObject())body=*req->getJsonObject();
    std::string unit=req->getParameter("accountingUnitId");
    if((op=="create"||op=="update")&&body.isObject()&&body["accountingUnitId"].isString()){if(!unit.empty()&&unit!=body["accountingUnitId"].asString())body["scopeMismatch"]=true;unit=body["accountingUnitId"].asString();}
    const auto result=co_await business_desk::domain_services::BankAccountService::execute(op,id,unit,body,business_desk::utils::extractAuditIdentity(req));
    auto r=drogon::HttpResponse::newHttpJsonResponse(result.toJson());r->addHeader("Cache-Control","no-store");const auto code=result.error["code"].asString();
    r->setStatusCode(result.success?(op=="create"?drogon::k201Created:drogon::k200OK):code=="validation_error"?drogon::k400BadRequest:code=="unauthorized"?drogon::k401Unauthorized:code=="forbidden"?drogon::k403Forbidden:code=="not_found"?drogon::k404NotFound:code=="conflict"?drogon::k409Conflict:drogon::k503ServiceUnavailable);co_return r;
}
}

drogon::Task<drogon::HttpResponsePtr> BankAccountController::list(drogon::HttpRequestPtr req) { co_return co_await handle(req,"list",std::string{}); }
drogon::Task<drogon::HttpResponsePtr> BankAccountController::get(drogon::HttpRequestPtr req, std::string id) { co_return co_await handle(req,"get",id); }
drogon::Task<drogon::HttpResponsePtr> BankAccountController::create(drogon::HttpRequestPtr req) { co_return co_await handle(req,"create",std::string{}); }
drogon::Task<drogon::HttpResponsePtr> BankAccountController::update(drogon::HttpRequestPtr req, std::string id) { co_return co_await handle(req,"update",id); }
drogon::Task<drogon::HttpResponsePtr> BankAccountController::remove(drogon::HttpRequestPtr req, std::string id) { co_return co_await handle(req,"delete",id); }

drogon::Task<drogon::HttpResponsePtr> BankAccountController::options(drogon::HttpRequestPtr req){co_return co_await handle(req,"options",std::string{});}
