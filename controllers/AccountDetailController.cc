#include "AccountDetailController.h"
#include "domain_services/gl/AccountDetailService.h"
#include <regex>
namespace {
bool uuid(const std::string &value) {static const std::regex pattern("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");return std::regex_match(value,pattern);}
int number(const std::string &value,int fallback) {try {size_t end;auto n=std::stoi(value,&end);return end==value.size()&&n>0?n:fallback;}catch(...){return fallback;}}
drogon::Task<drogon::HttpResponsePtr> handle(drogon::HttpRequestPtr req,std::string operation,std::string id={}) {
    using namespace business_desk;
    if(req->getMethod()==drogon::Options) {auto resp=drogon::HttpResponse::newHttpResponse();resp->setStatusCode(drogon::k204NoContent);co_return resp;}
    Json::Value body;const auto json=req->getJsonObject();if(json)body=*json;
    auto unitId=req->getParameter("accountingUnitId");
    if(operation=="create"||operation=="update") {
        if(body.isObject() && body["accountingUnitId"].isString())unitId=body["accountingUnitId"].asString();
    }
    dto::BaseApiResponse result;
    bool invalid=(!uuid(unitId))||(!id.empty()&&!uuid(id));
    if(operation=="create"||operation=="update") {
        if(!body.isObject())invalid=true;
        else {
            for(const auto &key:body.getMemberNames()) if(key!="accountingUnitId"&&key!="accountHeaderId"&&key!="accountNumber"&&key!="accountName"&&key!="currencyId"&&key!="status"&&key!="allowManualPosting"&&key!="isControlAccount")invalid=true;
            body.removeMember("accountingUnitId");
        }
    }
    if(invalid){result.error["code"]="validation_error";result.error["message"]="Invalid account-detail fields or UUID scope.";}
    else result=co_await domain_services::AccountDetailService::execute(operation,id,unitId,body,
        number(req->getParameter("pageNo"),1),number(req->getParameter("pageSize"),20),req->getParameter("query"),utils::extractAuditIdentity(req));
    auto response=drogon::HttpResponse::newHttpJsonResponse(result.toJson());response->addHeader("Cache-Control","no-store");
    auto code=result.error["code"].asString();
    response->setStatusCode(result.success?(operation=="create"?drogon::k201Created:drogon::k200OK):
        code=="validation_error"?drogon::k400BadRequest:code=="unauthorized"?drogon::k401Unauthorized:
        code=="not_found"?drogon::k404NotFound:code=="conflict"?drogon::k409Conflict:drogon::k503ServiceUnavailable);
    co_return response;
}
}
drogon::Task<drogon::HttpResponsePtr> AccountDetailController::list(drogon::HttpRequestPtr req){co_return co_await handle(req,"list");}
drogon::Task<drogon::HttpResponsePtr> AccountDetailController::create(drogon::HttpRequestPtr req){co_return co_await handle(req,"create");}
drogon::Task<drogon::HttpResponsePtr> AccountDetailController::get(drogon::HttpRequestPtr req,std::string id){co_return co_await handle(req,"get",std::move(id));}
drogon::Task<drogon::HttpResponsePtr> AccountDetailController::update(drogon::HttpRequestPtr req,std::string id){co_return co_await handle(req,"update",std::move(id));}
drogon::Task<drogon::HttpResponsePtr> AccountDetailController::remove(drogon::HttpRequestPtr req,std::string id){co_return co_await handle(req,"delete",std::move(id));}
