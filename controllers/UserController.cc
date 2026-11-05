#include "UserController.h"
#include "constants/ErrorCodes.h"
#include "domain_services/permissions/PermissionService.h"
#include "plugins/BusinessDeskServicePlugin.h"
#include <algorithm>
#include <charconv>
#include <cctype>
#include <exception>
#include <utility>

namespace {
using namespace business_desk;
enum class Action { List, Create, Update, Delete };

drogon::HttpResponsePtr respond(dto::BaseApiResponse body, bool created = false) {
    // Never expose SQL/bound values (which can contain emails or password hashes).
    body.error.removeMember("detail");
    auto response = drogon::HttpResponse::newHttpJsonResponse(body.toJson());
    response->addHeader("Cache-Control", "no-store");
    if (body.success) response->setStatusCode(created ? drogon::k201Created : drogon::k200OK);
    else {
        const int code = body.error["code"].asInt();
        drogon::HttpStatusCode status = drogon::k500InternalServerError;
        if (code >= constants::ERR_VALIDATION && code <= constants::ERR_INVALID_PHONE) status = drogon::k400BadRequest;
        else if (code == constants::ERR_UNAUTHORIZED) status = drogon::k401Unauthorized;
        else if (code == constants::ERR_PERMISSION_DENIED) status = drogon::k403Forbidden;
        else if (code == constants::ERR_RESOURCE_NOT_FOUND || code == constants::ERR_USER_NOT_FOUND) status = drogon::k404NotFound;
        else if (code >= constants::ERR_DUPLICATE_RESOURCE && code <= constants::ERR_DUPLICATE_USERNAME) status = drogon::k409Conflict;
        response->setStatusCode(status);
    }
    return response;
}
drogon::HttpResponsePtr reject(int code, const std::string &message) {
    dto::BaseApiResponse body;
    body.message = message;
    body.error["code"] = code;
    body.error["message"] = message;
    return respond(body);
}
bool uuid(const std::string &value) {
    if (value.size() != 36) return false;
    for (size_t i = 0; i < value.size(); ++i) {
        if (i == 8 || i == 13 || i == 18 || i == 23) { if (value[i] != '-') return false; }
        else if (!std::isxdigit(static_cast<unsigned char>(value[i]))) return false;
    }
    return true;
}
bool page(const std::string &value, int &out) {
    if (value.empty()) return true;
    const auto parsed = std::from_chars(value.data(), value.data() + value.size(), out);
    return parsed.ec == std::errc() && parsed.ptr == value.data() + value.size() && out > 0;
}
bool permitted(const drogon::HttpRequestPtr &request, Action action, bool host) {
    auto has = [&](const char *permission) {
        return domain_services::PermissionService::hasPermission(request, permission);
    };
    if (has("users.manage")) return true;
    if (host) {
        switch (action) {
            case Action::List: return has("users.read");
            case Action::Create: return has("users.create");
            case Action::Update: return has("users.update") || has("users.edit");
            case Action::Delete: return has("users.delete");
        }
    } else {
        // Use the existing tenant permission catalog, with concise aliases for
        // clients that already assign users.read/create/update/delete roles.
        if (has("user_management.manage")) return true;
        switch (action) {
            case Action::List: return has("user_management.users.view") || has("users.read");
            case Action::Create: return has("user_management.users.create") || has("users.create");
            case Action::Update: return has("user_management.users.update") || has("users.update");
            case Action::Delete: return has("user_management.users.delete") || has("users.delete");
        }
    }
    return false;
}
std::string validate(const Json::Value &body, bool creating) {
    if (!body.isObject()) return "Expected a JSON object.";
    if (body.empty()) return "At least one user field is required.";
    for (const auto &key : body.getMemberNames()) {
        if (key != "firstName" && key != "lastName" && key != "username" && key != "email" &&
            key != "password" && key != "phoneNumber" && key != "country")
            return "Unsupported user field: " + key + ". Tenant, role and privilege fields cannot be supplied.";
        if (!body[key].isString()) return key + " must be a string.";
        const auto value = body[key].asString();
        const size_t max = (key == "firstName" || key == "lastName" || key == "username") ? 100 : key == "password" ? 72 : 255;
        if (value.size() > max) return key + " exceeds its maximum length.";
        if (value.find('\0') != std::string::npos) return key + " cannot contain NUL characters.";
        if ((key == "username" || key == "email" || key == "password") && value.empty()) return key + " cannot be empty.";
        if (key == "password" && value.size() < 8) return "password must contain 8 to 72 bytes.";
        if (key == "username" && std::any_of(value.begin(), value.end(), [](unsigned char c) { return std::isspace(c) || c < 32; }))
            return "username cannot contain whitespace or control characters.";
        if (key == "email") {
            auto at = value.find('@');
            if (at == std::string::npos || at == 0 || at + 1 == value.size() || value.find('@', at + 1) != std::string::npos ||
                std::any_of(value.begin(), value.end(), [](unsigned char c) { return std::isspace(c) || c < 32; }))
                return "A valid email is required.";
        }
    }
    if (creating && (!body.isMember("email") || !body.isMember("password"))) return "email and password are required.";
    return {};
}
drogon::Task<drogon::HttpResponsePtr> dispatch(drogon::HttpRequestPtr request, std::string id, Action action, bool host) {
    if (request->getMethod() == drogon::Options) {
        auto response = drogon::HttpResponse::newHttpResponse();
        response->setStatusCode(drogon::k204NoContent);
        co_return response;
    }
    try {
        const auto &attributes = request->attributes();
        // Defense in depth if invoked without its registered JWT filter. Never
        // reinterpret a host identity as a tenant identity, or vice versa.
        const auto key = host ? "hostUserId" : "tenantUserId";
        if (!attributes->find(key) || attributes->get<std::string>(key).empty())
            co_return reject(constants::ERR_UNAUTHORIZED, "Authenticated user identity required.");
        if ((host && (attributes->find("tenantId") || attributes->find("tenantUserId"))) ||
            (!host && attributes->find("hostUserId")))
            co_return reject(constants::ERR_PERMISSION_DENIED, "Wrong authentication scope.");
        const auto identity = utils::extractAuditIdentity(request);
        if (!host && (!identity.hasTenant() || !uuid(identity.tenantId)))
            co_return reject(constants::ERR_UNAUTHORIZED, "Authenticated tenant identity required.");
        if (!permitted(request, action, host))
            co_return reject(constants::ERR_PERMISSION_DENIED, "User-management permission required.");
        // Neither route supports a client-selected tenant override, even for hosts.
        if (!request->getParameter("tenantId").empty() || !request->getParameter("accountId").empty())
            co_return reject(constants::ERR_VALIDATION, "User scope comes from authentication, not query parameters.");
        if ((action == Action::Update || action == Action::Delete) && !uuid(id))
            co_return reject(constants::ERR_VALIDATION, "Invalid user id.");
        auto plugin = drogon::app().getPlugin<plugins::BusinessDeskServicePlugin>();
        if (!plugin) co_return reject(constants::ERR_INTERNAL, "User service is unavailable.");
        auto &service = plugin->getUserService();
        dto::BaseApiResponse body;
        if (action == Action::List) {
            int pageNo = 1, pageSize = 20;
            if (!page(request->getParameter("pageNo"), pageNo) || !page(request->getParameter("pageSize"), pageSize))
                co_return reject(constants::ERR_VALIDATION, "pageNo and pageSize must be positive integers.");
            body = co_await service.getAllUsers(pageNo, pageSize, identity.tenantId, request->getParameter("query"));
        } else if (action == Action::Delete) body = co_await service.deleteUser(id, identity);
        else {
            const auto json = request->getJsonObject();
            if (!json) co_return reject(constants::ERR_VALIDATION, "Expected a JSON object.");
            const auto validation = validate(*json, action == Action::Create);
            if (!validation.empty()) co_return reject(constants::ERR_VALIDATION, validation);
            dto::UserDto input;
            input.fromJson(*json);
            if (action == Action::Create) body = co_await service.createUser(input, identity);
            else body = co_await service.updateUser(input, id, identity);
        }
        co_return respond(body, action == Action::Create);
    } catch (const std::exception &) {
        co_return reject(constants::ERR_INTERNAL, "Unable to process user-management request.");
    }
}
}

drogon::Task<drogon::HttpResponsePtr> UserController::listTenantUsers(drogon::HttpRequestPtr request) {
    co_return co_await dispatch(request, "", Action::List, false);
}
drogon::Task<drogon::HttpResponsePtr> UserController::createTenantUser(drogon::HttpRequestPtr request) {
    co_return co_await dispatch(request, "", Action::Create, false);
}
drogon::Task<drogon::HttpResponsePtr> UserController::updateTenantUser(drogon::HttpRequestPtr request, std::string id) {
    co_return co_await dispatch(request, std::move(id), Action::Update, false);
}
drogon::Task<drogon::HttpResponsePtr> UserController::deleteTenantUser(drogon::HttpRequestPtr request, std::string id) {
    co_return co_await dispatch(request, std::move(id), Action::Delete, false);
}
drogon::Task<drogon::HttpResponsePtr> UserController::listHostUsers(drogon::HttpRequestPtr request) {
    co_return co_await dispatch(request, "", Action::List, true);
}
drogon::Task<drogon::HttpResponsePtr> UserController::createHostUser(drogon::HttpRequestPtr request) {
    co_return co_await dispatch(request, "", Action::Create, true);
}
drogon::Task<drogon::HttpResponsePtr> UserController::updateHostUser(drogon::HttpRequestPtr request, std::string id) {
    co_return co_await dispatch(request, std::move(id), Action::Update, true);
}
drogon::Task<drogon::HttpResponsePtr> UserController::deleteHostUser(drogon::HttpRequestPtr request, std::string id) {
    co_return co_await dispatch(request, std::move(id), Action::Delete, true);
}
