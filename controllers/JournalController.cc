#include "JournalController.h"
#include "domain_services/gl/JournalService.h"
namespace {
drogon::Task<drogon::HttpResponsePtr> handle(drogon::HttpRequestPtr req,std::string op,std::string id){
    if(req->getMethod()==drogon::Options){auto r=drogon::HttpResponse::newHttpResponse();r->setStatusCode(drogon::k204NoContent);co_return r;}
    Json::Value body;if(req->getJsonObject())body=*req->getJsonObject();
    std::string unit=req->getParameter("accountingUnitId");
    if((op=="create"||op=="update"||op=="post"||op=="validate")&&body.isObject()&&body["accountingUnitId"].isString()){if(!unit.empty()&&unit!=body["accountingUnitId"].asString())body["scopeMismatch"]=true;unit=body["accountingUnitId"].asString();}
    if(op=="delete"){
        body["accountingUnitId"]=unit;const auto version=req->getParameter("version");
        if(version.size()<=10&&!version.empty()&&version.find_first_not_of("0123456789")==std::string::npos){const auto v=std::stoll(version);if(v>0&&v<=2147483647)body["version"]=static_cast<int>(v);}
    }
    const auto result=co_await business_desk::domain_services::JournalService::execute(op,id,unit,body,business_desk::utils::extractAuditIdentity(req));
    auto r=drogon::HttpResponse::newHttpJsonResponse(result.toJson());r->addHeader("Cache-Control","no-store");const auto code=result.error["code"].asString();
    r->setStatusCode(result.success?(op=="create"?drogon::k201Created:drogon::k200OK):code=="validation_error"?drogon::k400BadRequest:code=="unauthorized"?drogon::k401Unauthorized:code=="forbidden"?drogon::k403Forbidden:code=="not_found"?drogon::k404NotFound:(code=="conflict"||code=="approval_required")?drogon::k409Conflict:drogon::k503ServiceUnavailable);co_return r;
}
}

drogon::Task<drogon::HttpResponsePtr> JournalController::list(drogon::HttpRequestPtr req) { co_return co_await handle(req,"list",std::string{}); }
drogon::Task<drogon::HttpResponsePtr> JournalController::get(drogon::HttpRequestPtr req, std::string id) { co_return co_await handle(req,"get",id); }
drogon::Task<drogon::HttpResponsePtr> JournalController::create(drogon::HttpRequestPtr req) { co_return co_await handle(req,"create",std::string{}); }
drogon::Task<drogon::HttpResponsePtr> JournalController::update(drogon::HttpRequestPtr req, std::string id) { co_return co_await handle(req,"update",id); }
drogon::Task<drogon::HttpResponsePtr> JournalController::remove(drogon::HttpRequestPtr req, std::string id) { co_return co_await handle(req,"delete",id); }

drogon::Task<drogon::HttpResponsePtr> JournalController::options(drogon::HttpRequestPtr req){co_return co_await handle(req,"options",std::string{});}

drogon::Task<drogon::HttpResponsePtr> JournalController::post(drogon::HttpRequestPtr req,std::string id){co_return co_await handle(req,"post",id);}
drogon::Task<drogon::HttpResponsePtr> JournalController::validate(drogon::HttpRequestPtr req){co_return co_await handle(req,"validate",std::string{});}
drogon::Task<drogon::HttpResponsePtr> JournalController::nextNumber(drogon::HttpRequestPtr req){co_return co_await handle(req,"next-number",std::string{});}
