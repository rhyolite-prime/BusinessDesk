#include "TenantController.h"
#include "plugins/BusinessDeskServicePlugin.h"
#include "domain_services/permissions/PermissionService.h"
#include <charconv>
#include <utility>

namespace {
using namespace business_desk;
enum class Action { List, Get, Create, Update, Delete, Activate, Deactivate };
drogon::HttpResponsePtr respond(const dto::BaseApiResponse &body, bool created=false) {
    auto response=drogon::HttpResponse::newHttpJsonResponse(body.toJson());
    response->addHeader("Cache-Control","no-store");
    if (body.success) response->setStatusCode(created?drogon::k201Created:drogon::k200OK);
    else {
        auto code=body.error["code"].asString();
        response->setStatusCode(code=="validation_error"?drogon::k400BadRequest:
            code=="not_found"?drogon::k404NotFound:code=="conflict"?drogon::k409Conflict:
            code=="forbidden"?drogon::k403Forbidden:drogon::k500InternalServerError);
    }
    return response;
}
drogon::HttpResponsePtr invalid(const std::string &message,const std::string &code="validation_error") {
    dto::BaseApiResponse body; body.error["code"]=code; body.error["message"]=message;
    return respond(body);
}
bool page(const std::string &value,int &out) {
    if (value.empty()) return true;
    const auto parsed=std::from_chars(value.data(),value.data()+value.size(),out);
    return parsed.ec==std::errc() && parsed.ptr==value.data()+value.size() && out>0;
}
drogon::Task<drogon::HttpResponsePtr> dispatch(drogon::HttpRequestPtr request,std::string id,Action action) {
    if (request->getMethod()==drogon::Options) {
        auto response=drogon::HttpResponse::newHttpResponse();
        response->setStatusCode(drogon::k204NoContent);
        co_return response;
    }
    const auto identity=utils::extractAuditIdentity(request);
    const std::string permission = (action==Action::List || action==Action::Get)?"tenants.read":
        action==Action::Create?"tenants.create":action==Action::Delete?"tenants.delete":
        (action==Action::Activate || action==Action::Deactivate)?"tenants.activate":"tenants.update";

    if (identity.hasTenant() || !identity.hasUser() || !(domain_services::PermissionService::hasPermission(request,permission) ||  domain_services::PermissionService::hasPermission(request,"tenants.manage")))
        co_return invalid("Host tenant-management permission required.","forbidden");
    auto &service=drogon::app().getPlugin<plugins::BusinessDeskServicePlugin>()->getTenantService();
    dto::BaseApiResponse body;
    if (action==Action::List) {
        int pageNo=1,pageSize=20;
        if (!page(request->getParameter("pageNo"),pageNo) || !page(request->getParameter("pageSize"),pageSize))
            co_return invalid("pageNo and pageSize must be positive integers.");
        body=co_await service.getAllTenants(pageNo,pageSize,request->getParameter("query"),identity);
    } else if (action==Action::Get) body=co_await service.getTenant(id,identity);
    else if (action==Action::Delete) body=co_await service.deleteTenant(id,identity);
    else if (action==Action::Activate) body=co_await service.activateTenant(id,identity);
    else if (action==Action::Deactivate) body=co_await service.deActivateTenant(id,identity);
    else {
        const auto json=request->getJsonObject();
        if (!json || !json->isObject()) co_return invalid("Expected a JSON object.");
        for (const char *field : {"tenancyName","name","adminEmailAddress","connectionString"}) {
            if (json->isMember(field) && !(*json)[field].isString() &&
                !(std::string(field)=="connectionString" && (*json)[field].isNull()))
                co_return invalid(std::string(field)+" must be a string (connectionString may be null).");
        }
        dto::TenantDto input; input.fromJson(*json);
        if (action==Action::Create) body=co_await service.createTenant(input,identity);
        else body=co_await service.updateTenant(input,id,identity);
    }
    co_return respond(body,action==Action::Create);
}
}
drogon::Task<drogon::HttpResponsePtr> TenantController::list(drogon::HttpRequestPtr request) {
    co_return co_await dispatch(request,"",Action::List);
}
drogon::Task<drogon::HttpResponsePtr> TenantController::create(drogon::HttpRequestPtr request) {
    co_return co_await dispatch(request,"",Action::Create);
}
drogon::Task<drogon::HttpResponsePtr> TenantController::get(drogon::HttpRequestPtr request,std::string id) {
    co_return co_await dispatch(request,std::move(id),Action::Get);
}
drogon::Task<drogon::HttpResponsePtr> TenantController::update(drogon::HttpRequestPtr request,std::string id) {
    co_return co_await dispatch(request,std::move(id),Action::Update);
}
drogon::Task<drogon::HttpResponsePtr> TenantController::remove(drogon::HttpRequestPtr request,std::string id) {
    co_return co_await dispatch(request,std::move(id),Action::Delete);
}
drogon::Task<drogon::HttpResponsePtr> TenantController::activate(drogon::HttpRequestPtr request,std::string id) {
    co_return co_await dispatch(request,std::move(id),Action::Activate);
}
drogon::Task<drogon::HttpResponsePtr> TenantController::deactivate(drogon::HttpRequestPtr request,std::string id) {
    co_return co_await dispatch(request,std::move(id),Action::Deactivate);
}
