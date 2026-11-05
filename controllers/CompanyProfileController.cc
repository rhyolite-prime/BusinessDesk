#include "CompanyProfileController.h"
#include "domain_services/shared/CompanyProfileService.h"
namespace {
drogon::Task<drogon::HttpResponsePtr> handle(drogon::HttpRequestPtr req,std::string op){
    Json::Value body;if(req->getJsonObject())body=*req->getJsonObject();
    const auto result=co_await business_desk::domain_services::CompanyProfileService::execute(op,body,business_desk::utils::extractAuditIdentity(req));
    auto r=drogon::HttpResponse::newHttpJsonResponse(result.toJson());r->addHeader("Cache-Control","no-store");const auto code=result.error["code"].asString();
    r->setStatusCode(result.success?(op=="create"?drogon::k201Created:drogon::k200OK):code=="validation_error"?drogon::k400BadRequest:code=="unauthorized"?drogon::k401Unauthorized:code=="forbidden"?drogon::k403Forbidden:code=="not_found"?drogon::k404NotFound:code=="conflict"?drogon::k409Conflict:drogon::k503ServiceUnavailable);co_return r;
}
}


drogon::Task<drogon::HttpResponsePtr> CompanyProfileController::get(drogon::HttpRequestPtr req){co_return co_await handle(req,"get");}
drogon::Task<drogon::HttpResponsePtr> CompanyProfileController::create(drogon::HttpRequestPtr req){co_return co_await handle(req,"create");}
drogon::Task<drogon::HttpResponsePtr> CompanyProfileController::update(drogon::HttpRequestPtr req){co_return co_await handle(req,"update");}
drogon::Task<drogon::HttpResponsePtr> CompanyProfileController::remove(drogon::HttpRequestPtr req){co_return co_await handle(req,"delete");}
