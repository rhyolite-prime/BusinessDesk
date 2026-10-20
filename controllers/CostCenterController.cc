#include "CostCenterController.h"
#include "domain_services/shared/CostCenterService.h"
namespace {
int number(const std::string &s,int fallback){if(s.empty())return fallback;try{size_t end;auto n=std::stoi(s,&end);return end==s.size()&&n>0?n:0;}catch(...){return 0;}}
drogon::Task<drogon::HttpResponsePtr> handle(drogon::HttpRequestPtr req,std::string op,std::string id){
    if(req->getMethod()==drogon::Options){auto r=drogon::HttpResponse::newHttpResponse();r->setStatusCode(drogon::k204NoContent);co_return r;}
    Json::Value body;if(req->getJsonObject())body=*req->getJsonObject();
    const auto result=co_await business_desk::domain_services::CostCenterService::execute(op,id,body,business_desk::utils::extractAuditIdentity(req));
    auto r=drogon::HttpResponse::newHttpJsonResponse(result.toJson());r->addHeader("Cache-Control","no-store");const auto code=result.error["code"].asString();
    r->setStatusCode(result.success?(op=="create"?drogon::k201Created:drogon::k200OK):code=="validation_error"?drogon::k400BadRequest:code=="unauthorized"?drogon::k401Unauthorized:code=="forbidden"?drogon::k403Forbidden:code=="not_found"?drogon::k404NotFound:code=="conflict"?drogon::k409Conflict:drogon::k503ServiceUnavailable);co_return r;
}
}

drogon::Task<drogon::HttpResponsePtr> CostCenterController::list(drogon::HttpRequestPtr req) { co_return co_await handle(req,"list",std::string{}); }
drogon::Task<drogon::HttpResponsePtr> CostCenterController::get(drogon::HttpRequestPtr req, std::string id) { co_return co_await handle(req,"get",id); }
drogon::Task<drogon::HttpResponsePtr> CostCenterController::create(drogon::HttpRequestPtr req) { co_return co_await handle(req,"create",std::string{}); }
drogon::Task<drogon::HttpResponsePtr> CostCenterController::update(drogon::HttpRequestPtr req, std::string id) { co_return co_await handle(req,"update",id); }
drogon::Task<drogon::HttpResponsePtr> CostCenterController::remove(drogon::HttpRequestPtr req, std::string id) { co_return co_await handle(req,"delete",id); }
