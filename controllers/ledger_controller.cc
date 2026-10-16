#include "controllers/ledger_controller.h"

#include <json/json.h>
#include <trantor/utils/Logger.h>

#include <charconv>
#include <cctype>
#include <optional>
#include <string>
#include <string_view>
#include <utility>
#include <vector>

namespace businessdesk::ledger
{
namespace
{
using drogon::HttpRequestPtr;
using drogon::HttpResponsePtr;
using drogon::HttpStatusCode;
using drogon::k200OK;
using drogon::k201Created;
using drogon::k400BadRequest;
using drogon::k404NotFound;
using drogon::k409Conflict;
using drogon::k500InternalServerError;
using drogon::k503ServiceUnavailable;
using businessdesk::dto::AccountControlDto;
using businessdesk::dto::AccountDetailDto;
using businessdesk::dto::AccountHeadDto;

HttpResponsePtr errorResponse(HttpStatusCode status,
                              std::string code,
                              std::string message,
                              const std::vector<std::string> &details = {})
{
    Json::Value body(Json::objectValue);
    body["error"]["code"] = std::move(code);
    body["error"]["message"] = std::move(message);
    if (!details.empty())
    {
        Json::Value errorDetails(Json::arrayValue);
        for (const auto &detail : details)
        {
            errorDetails.append(detail);
        }
        body["error"]["details"] = std::move(errorDetails);
    }
    auto response = drogon::HttpResponse::newHttpJsonResponse(body);
    response->setStatusCode(status);
    return response;
}

HttpResponsePtr domainErrorResponse(const LedgerServiceError &error)
{
    switch (error.code())
    {
        case LedgerErrorCode::Validation:
            return errorResponse(k400BadRequest,
                                 "validation_error",
                                 error.what(),
                                 error.details());
        case LedgerErrorCode::NotFound:
            return errorResponse(k404NotFound, "not_found", error.what());
        case LedgerErrorCode::Conflict:
            return errorResponse(k409Conflict, "conflict", error.what());
        case LedgerErrorCode::Unavailable:
            return errorResponse(k503ServiceUnavailable,
                                 "service_unavailable",
                                 error.what());
    }
    return errorResponse(k500InternalServerError,
                         "internal_error",
                         "The request could not be completed.");
}

HttpResponsePtr databaseErrorResponse(const drogon::orm::DrogonDbException &error)
{
    const auto *sqlError = dynamic_cast<const drogon::orm::SqlError *>(&error.base());
    if (sqlError != nullptr)
    {
        if (sqlError->sqlState() == "23505")
        {
            return errorResponse(k409Conflict,
                                 "conflict",
                                 "An account setup record with the same unique key already exists.");
        }
        if (sqlError->sqlState() == "23503")
        {
            return errorResponse(k409Conflict,
                                 "conflict",
                                 "The account setup record is still referenced by another record.");
        }
        if (sqlError->sqlState() == "23514")
        {
            return errorResponse(k400BadRequest,
                                 "validation_error",
                                 "The account setup record violates a database constraint.");
        }
    }
    LOG_ERROR << "Ledger database request failed: " << error.base().what();
    return errorResponse(k500InternalServerError,
                         "database_error",
                         "The account setup request could not be completed.");
}

template <typename Operation, typename Serializer>
drogon::Task<HttpResponsePtr> respond(Operation operation,
                                      Serializer serializer,
                                      HttpStatusCode successStatus = k200OK)
{
    try
    {
        auto result = co_await operation();
        Json::Value body(Json::objectValue);
        body["data"] = serializer(result);
        auto response = drogon::HttpResponse::newHttpJsonResponse(body);
        response->setStatusCode(successStatus);
        co_return response;
    }
    catch (const LedgerServiceError &error)
    {
        co_return domainErrorResponse(error);
    }
    catch (const drogon::orm::DrogonDbException &error)
    {
        co_return databaseErrorResponse(error);
    }
    catch (const std::exception &error)
    {
        LOG_ERROR << "Unhandled Ledger API error: " << error.what();
        co_return errorResponse(k500InternalServerError,
                                "internal_error",
                                "The request could not be completed.");
    }
    catch (...)
    {
        LOG_ERROR << "Unhandled non-standard Ledger API error.";
        co_return errorResponse(k500InternalServerError,
                                "internal_error",
                                "The request could not be completed.");
    }
}

Json::Value bodyObject(const HttpRequestPtr &request)
{
    const auto payload = request->getJsonObject();
    if (!payload || !payload->isObject())
    {
        throw LedgerServiceError(LedgerErrorCode::Validation,
                                 "A JSON object is required as the request body.");
    }
    return *payload;
}

std::string requiredString(const Json::Value &body,
                          const char *key,
                          const char *label,
                          std::vector<std::string> &errors)
{
    if (!body.isMember(key) || !body[key].isString())
    {
        errors.emplace_back(std::string(label) + " is required and must be a string.");
        return {};
    }
    return body[key].asString();
}

std::optional<std::string> optionalString(const Json::Value &body,
                                          const char *key,
                                          const char *label,
                                          std::vector<std::string> &errors)
{
    if (!body.isMember(key) || body[key].isNull())
    {
        return std::nullopt;
    }
    if (!body[key].isString())
    {
        errors.emplace_back(std::string(label) + " must be a string or null.");
        return std::nullopt;
    }
    return body[key].asString();
}

bool optionalBoolean(const Json::Value &body,
                     const char *key,
                     const char *label,
                     bool defaultValue,
                     std::vector<std::string> &errors)
{
    if (!body.isMember(key))
    {
        return defaultValue;
    }
    if (!body[key].isBool())
    {
        errors.emplace_back(std::string(label) + " must be a boolean.");
        return defaultValue;
    }
    return body[key].asBool();
}

std::int32_t optionalInteger(const Json::Value &body,
                             const char *key,
                             const char *label,
                             std::int32_t defaultValue,
                             std::vector<std::string> &errors)
{
    if (!body.isMember(key))
    {
        return defaultValue;
    }
    if (!body[key].isInt())
    {
        errors.emplace_back(std::string(label) + " must be a 32-bit integer.");
        return defaultValue;
    }
    return body[key].asInt();
}

std::optional<std::int16_t> standardAccountType(const Json::Value &body,
                                                std::vector<std::string> &errors)
{
    if (!body.isMember("standardAccountType"))
    {
        errors.emplace_back("standardAccountType is required.");
        return std::nullopt;
    }

    const auto &value = body["standardAccountType"];
    if (value.isInt())
    {
        const auto code = value.asInt();
        if (code >= 0 && code <= 4)
        {
            return static_cast<std::int16_t>(code);
        }
    }
    else if (value.isString())
    {
        std::string name = value.asString();
        for (auto &character : name)
        {
            character = static_cast<char>(std::tolower(static_cast<unsigned char>(character)));
        }
        if (name == "asset" || name == "assets")
        {
            return 0;
        }
        if (name == "liability" || name == "liabilities")
        {
            return 1;
        }
        if (name == "equity")
        {
            return 2;
        }
        if (name == "revenue")
        {
            return 3;
        }
        if (name == "expense" || name == "expenses")
        {
            return 4;
        }
    }

    errors.emplace_back("standardAccountType must be one of Asset, Liability, Equity, Revenue, Expense, or a matching code from 0 to 4.");
    return std::nullopt;
}

void throwBodyErrors(const std::vector<std::string> &errors)
{
    if (!errors.empty())
    {
        throw LedgerServiceError(LedgerErrorCode::Validation,
                                 "The request body is invalid.",
                                 errors);
    }
}

dto::AccountHeadInput parseAccountHeadInput(const HttpRequestPtr &request)
{
    const auto body = bodyObject(request);
    std::vector<std::string> errors;
    dto::AccountHeadInput input;
    input.name = requiredString(body, "name", "name", errors);
    input.parentGroupId = optionalString(body, "parentId", "parentId", errors);
    const auto type = standardAccountType(body, errors);
    if (type)
    {
        input.standardAccountType = *type;
    }
    input.sortOrder = optionalInteger(body, "sortOrder", "sortOrder", 0, errors);
    input.isActive = optionalBoolean(body, "isActive", "isActive", true, errors);
    throwBodyErrors(errors);
    return input;
}

dto::AccountControlInput parseAccountControlInput(const HttpRequestPtr &request)
{
    const auto body = bodyObject(request);
    std::vector<std::string> errors;
    dto::AccountControlInput input;
    input.accountGroupId = requiredString(body, "accountGroupId", "accountGroupId", errors);
    input.parentAccountHeaderId = optionalString(body,
                                                 "parentAccountHeaderId",
                                                 "parentAccountHeaderId",
                                                 errors);
    input.accountHeaderName = requiredString(body,
                                             "accountHeaderName",
                                             "accountHeaderName",
                                             errors);
    input.minAccount = optionalInteger(body, "minAccount", "minAccount", 0, errors);
    input.maxAccount = optionalInteger(body, "maxAccount", "maxAccount", 0, errors);
    input.isActive = optionalBoolean(body, "isActive", "isActive", true, errors);
    throwBodyErrors(errors);
    return input;
}

dto::AccountDetailInput parseAccountDetailInput(const HttpRequestPtr &request)
{
    const auto body = bodyObject(request);
    std::vector<std::string> errors;
    dto::AccountDetailInput input;
    input.accountHeaderId = requiredString(body,
                                           "accountHeaderId",
                                           "accountHeaderId",
                                           errors);
    input.accountGroupId = optionalString(body, "accountGroupId", "accountGroupId", errors);
    input.accountNumber = requiredString(body, "accountNumber", "accountNumber", errors);
    input.accountName = requiredString(body, "accountName", "accountName", errors);
    if (body.isMember("status"))
    {
        if (body["status"].isString())
        {
            input.status = body["status"].asString();
        }
        else
        {
            errors.emplace_back("status must be a string.");
        }
    }
    input.currencyId = optionalString(body, "currencyId", "currencyId", errors);
    input.allowManualPosting = optionalBoolean(body,
                                               "allowManualPosting",
                                               "allowManualPosting",
                                               true,
                                               errors);
    input.isControlAccount = optionalBoolean(body,
                                             "isControlAccount",
                                             "isControlAccount",
                                             false,
                                             errors);
    throwBodyErrors(errors);
    return input;
}

dto::LedgerScope scopeFromRequest(const HttpRequestPtr &request)
{
    const std::string tenantHeader = request->getHeader("X-Tenant-Id");
    const std::string unitHeader = request->getHeader("X-Accounting-Unit-Id");
    std::int32_t tenantId{};
    const auto tenantParse = std::from_chars(tenantHeader.data(),
                                             tenantHeader.data() + tenantHeader.size(),
                                             tenantId);
    if (tenantHeader.empty() || tenantParse.ec != std::errc{} ||
        tenantParse.ptr != tenantHeader.data() + tenantHeader.size() || tenantId <= 0)
    {
        throw LedgerServiceError(LedgerErrorCode::Validation,
                                 "A positive X-Tenant-Id header is required.");
    }
    if (unitHeader.size() != 36)
    {
        throw LedgerServiceError(LedgerErrorCode::Validation,
                                 "A UUID X-Accounting-Unit-Id header is required.");
    }
    return {tenantId, unitHeader};
}

std::optional<std::string> queryOptional(const HttpRequestPtr &request, const char *key)
{
    auto value = request->getParameter(key);
    if (value.empty())
    {
        return std::nullopt;
    }
    return value;
}

std::string jsonString(const Json::Value &object, const char *key)
{
    const auto &value = object[key];
    return value.isString() ? value.asString() : std::string{};
}

Json::Value toJson(const AccountHeadDto &value)
{
    Json::Value json(Json::objectValue);
    json["id"] = value.id;
    json["name"] = value.name;
    json["parentId"] = value.parentId ? Json::Value(*value.parentId)
                                      : Json::Value(Json::nullValue);
    json["standardAccountType"] = value.standardAccountType;
    json["sortOrder"] = value.sortOrder;
    json["isActive"] = value.isActive;
    return json;
}

Json::Value toJson(const AccountControlDto &value)
{
    Json::Value json(Json::objectValue);
    json["id"] = value.id;
    json["accountGroupId"] = value.accountGroupId;
    json["parentAccountHeaderId"] = value.parentAccountHeaderId
                                        ? Json::Value(*value.parentAccountHeaderId)
                                        : Json::Value(Json::nullValue);
    json["accountHeaderName"] = value.accountHeaderName;
    json["minAccount"] = value.minAccount;
    json["maxAccount"] = value.maxAccount;
    json["isActive"] = value.isActive;
    return json;
}

Json::Value toJson(const AccountDetailDto &value)
{
    Json::Value json(Json::objectValue);
    json["id"] = value.id;
    json["accountHeaderId"] = value.accountHeaderId
                                   ? Json::Value(*value.accountHeaderId)
                                   : Json::Value(Json::nullValue);
    json["accountGroupId"] = value.accountGroupId;
    json["accountNumber"] = value.accountNumber;
    json["accountName"] = value.accountName;
    json["status"] = value.status;
    json["currencyId"] = value.currencyId ? Json::Value(*value.currencyId)
                                          : Json::Value(Json::nullValue);
    json["standardAccountType"] = value.standardAccountType;
    json["allowManualPosting"] = value.allowManualPosting;
    json["isControlAccount"] = value.isControlAccount;
    return json;
}

template <typename Values>
Json::Value toJsonArray(const Values &values)
{
    Json::Value array(Json::arrayValue);
    for (const auto &value : values)
    {
        array.append(toJson(value));
    }
    return array;
}

Json::Value deletedResource(const std::string &id)
{
    Json::Value json(Json::objectValue);
    json["id"] = id;
    json["deleted"] = true;
    return json;
}

}  // namespace

drogon::Task<HttpResponsePtr> LedgerController::validateJournal(HttpRequestPtr request) const
{
    try
    {
        const auto payload = bodyObject(request);
        JournalDraft draft;
        draft.batchDate = jsonString(payload, "batchDate");
        draft.description = jsonString(payload, "description");

        const auto &lines = payload["lines"];
        if (lines.isArray())
        {
            draft.lines.reserve(lines.size());
            for (const auto &line : lines)
            {
                if (!line.isObject())
                {
                    draft.lines.emplace_back();
                    continue;
                }
                draft.lines.push_back({jsonString(line, "accountId"),
                                       jsonString(line, "description"),
                                       jsonString(line, "debit"),
                                       jsonString(line, "credit")});
            }
        }

        const JournalValidation validation = service_.validateJournalDraft(draft);
        Json::Value body(Json::objectValue);
        body["valid"] = validation.valid;
        body["balanced"] = validation.balanced;
        body["debitTotal"] = validation.debitTotal;
        body["creditTotal"] = validation.creditTotal;
        Json::Value errors(Json::arrayValue);
        for (const auto &error : validation.errors)
        {
            errors.append(error);
        }
        body["errors"] = std::move(errors);
        co_return drogon::HttpResponse::newHttpJsonResponse(body);
    }
    catch (const LedgerServiceError &error)
    {
        co_return domainErrorResponse(error);
    }
}

drogon::Task<HttpResponsePtr> LedgerController::listAccountHeads(HttpRequestPtr request) const
{
    auto db = drogon::app().getDbClient();
    return respond([this, request, db] {
        return service_.listAccountHeads(db, scopeFromRequest(request));
    },
                  [](const auto &values) { return toJsonArray(values); });
}

drogon::Task<HttpResponsePtr> LedgerController::createAccountHead(HttpRequestPtr request) const
{
    auto db = drogon::app().getDbClient();
    return respond([this, request, db] {
        return service_.createAccountHead(db,
                                          scopeFromRequest(request),
                                          parseAccountHeadInput(request));
    },
                  [](const auto &value) { return toJson(value); },
                  k201Created);
}

drogon::Task<HttpResponsePtr> LedgerController::getAccountHead(HttpRequestPtr request,
                                                               std::string id) const
{
    auto db = drogon::app().getDbClient();
    return respond([this, request, db, id = std::move(id)]() mutable {
        return service_.getAccountHead(db, scopeFromRequest(request), std::move(id));
    },
                  [](const auto &value) { return toJson(value); });
}

drogon::Task<HttpResponsePtr> LedgerController::updateAccountHead(HttpRequestPtr request,
                                                                  std::string id) const
{
    auto db = drogon::app().getDbClient();
    return respond([this, request, db, id = std::move(id)]() mutable {
        return service_.updateAccountHead(db,
                                          scopeFromRequest(request),
                                          std::move(id),
                                          parseAccountHeadInput(request));
    },
                  [](const auto &value) { return toJson(value); });
}

drogon::Task<HttpResponsePtr> LedgerController::deleteAccountHead(HttpRequestPtr request,
                                                                  std::string id) const
{
    auto db = drogon::app().getDbClient();
    return respond([this, request, db, id = std::move(id)]() mutable {
        return service_.deleteAccountHead(db, scopeFromRequest(request), std::move(id));
    },
                  [](const auto &value) { return deletedResource(value); });
}

drogon::Task<HttpResponsePtr> LedgerController::listAccountControls(HttpRequestPtr request) const
{
    auto db = drogon::app().getDbClient();
    return respond([this, request, db] {
        dto::AccountControlFilter filter;
        filter.accountGroupId = queryOptional(request, "accountGroupId");
        return service_.listAccountControls(db, scopeFromRequest(request), std::move(filter));
    },
                  [](const auto &values) { return toJsonArray(values); });
}

drogon::Task<HttpResponsePtr> LedgerController::createAccountControl(HttpRequestPtr request) const
{
    auto db = drogon::app().getDbClient();
    return respond([this, request, db] {
        return service_.createAccountControl(db,
                                             scopeFromRequest(request),
                                             parseAccountControlInput(request));
    },
                  [](const auto &value) { return toJson(value); },
                  k201Created);
}

drogon::Task<HttpResponsePtr> LedgerController::getAccountControl(HttpRequestPtr request,
                                                                  std::string id) const
{
    auto db = drogon::app().getDbClient();
    return respond([this, request, db, id = std::move(id)]() mutable {
        return service_.getAccountControl(db, scopeFromRequest(request), std::move(id));
    },
                  [](const auto &value) { return toJson(value); });
}

drogon::Task<HttpResponsePtr> LedgerController::updateAccountControl(HttpRequestPtr request,
                                                                     std::string id) const
{
    auto db = drogon::app().getDbClient();
    return respond([this, request, db, id = std::move(id)]() mutable {
        return service_.updateAccountControl(db,
                                             scopeFromRequest(request),
                                             std::move(id),
                                             parseAccountControlInput(request));
    },
                  [](const auto &value) { return toJson(value); });
}

drogon::Task<HttpResponsePtr> LedgerController::deleteAccountControl(HttpRequestPtr request,
                                                                     std::string id) const
{
    auto db = drogon::app().getDbClient();
    return respond([this, request, db, id = std::move(id)]() mutable {
        return service_.deleteAccountControl(db, scopeFromRequest(request), std::move(id));
    },
                  [](const auto &value) { return deletedResource(value); });
}

drogon::Task<HttpResponsePtr> LedgerController::listAccountDetails(HttpRequestPtr request) const
{
    auto db = drogon::app().getDbClient();
    return respond([this, request, db] {
        dto::AccountDetailFilter filter;
        filter.accountGroupId = queryOptional(request, "accountGroupId");
        filter.accountHeaderId = queryOptional(request, "accountHeaderId");
        filter.status = queryOptional(request, "status");
        if (filter.status)
        {
            for (auto &character : *filter.status)
            {
                character = static_cast<char>(std::tolower(static_cast<unsigned char>(character)));
            }
        }
        return service_.listAccountDetails(db, scopeFromRequest(request), std::move(filter));
    },
                  [](const auto &values) { return toJsonArray(values); });
}

drogon::Task<HttpResponsePtr> LedgerController::createAccountDetail(HttpRequestPtr request) const
{
    auto db = drogon::app().getDbClient();
    return respond([this, request, db] {
        return service_.createAccountDetail(db,
                                            scopeFromRequest(request),
                                            parseAccountDetailInput(request));
    },
                  [](const auto &value) { return toJson(value); },
                  k201Created);
}

drogon::Task<HttpResponsePtr> LedgerController::getAccountDetail(HttpRequestPtr request,
                                                                 std::string id) const
{
    auto db = drogon::app().getDbClient();
    return respond([this, request, db, id = std::move(id)]() mutable {
        return service_.getAccountDetail(db, scopeFromRequest(request), std::move(id));
    },
                  [](const auto &value) { return toJson(value); });
}

drogon::Task<HttpResponsePtr> LedgerController::updateAccountDetail(HttpRequestPtr request,
                                                                    std::string id) const
{
    auto db = drogon::app().getDbClient();
    return respond([this, request, db, id = std::move(id)]() mutable {
        return service_.updateAccountDetail(db,
                                            scopeFromRequest(request),
                                            std::move(id),
                                            parseAccountDetailInput(request));
    },
                  [](const auto &value) { return toJson(value); });
}

drogon::Task<HttpResponsePtr> LedgerController::deleteAccountDetail(HttpRequestPtr request,
                                                                    std::string id) const
{
    auto db = drogon::app().getDbClient();
    return respond([this, request, db, id = std::move(id)]() mutable {
        return service_.deleteAccountDetail(db, scopeFromRequest(request), std::move(id));
    },
                  [](const auto &value) { return deletedResource(value); });
}

}  // namespace businessdesk::ledger
