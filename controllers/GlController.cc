#include "GlController.h"
#include "constants/ErrorCodes.h"
#include "ApiResponseStub.h"
#include "dto/BaseGlDto.h"
#include "plugins/BusinessDeskServicePlugin.h"
#include "utils/AuditUtil.h"

#include <string>

using namespace business_desk::constants;

namespace {
// Reads a non-negative integer query parameter; falls back when absent or malformed.
int parseIntegerParam(const drogon::HttpRequestPtr &request,
                      const std::string &name,
                      int fallback,
                      int minValue)
{
    const auto raw = request->getParameter(name);
    if (raw.empty())
    {
        return fallback;
    }
    try
    {
        const int value = std::stoi(raw);
        return value < minValue ? minValue : value;
    }
    catch (const std::exception &)
    {
        return fallback;
    }
}

// Translates a service response into an HTTP response: success keeps the
// caller-supplied status, domain errors map to the documented status codes.
drogon::HttpResponsePtr toApiResponse(const business_desk::dto::BaseApiResponse &body,
                                      drogon::HttpStatusCode successStatus)
{
    auto response = drogon::HttpResponse::newHttpJsonResponse(body.toJson());
    if (body.success)
    {
        response->setStatusCode(successStatus);
        return response;
    }

    std::string errorCode;
    if (body.error.isMember("code") && body.error["code"].isString())
    {
        errorCode = body.error["code"].asString();
    }

    if (errorCode == "validation_error")
    {
        response->setStatusCode(drogon::k400BadRequest);
    }
    else if (errorCode == "not_found")
    {
        response->setStatusCode(drogon::k404NotFound);
    }
    else if (errorCode == "conflict")
    {
        response->setStatusCode(drogon::k409Conflict);
    }
    else
    {
        response->setStatusCode(drogon::k500InternalServerError);
    }
    return response;
}

drogon::HttpResponsePtr makeBadRequestResponse(const drogon::HttpRequestPtr &request,
                                               const std::string &message)
{
    business_desk::dto::BaseApiResponse body;
    body.success = false;
    body.targetUrl = request->path();
    body.message = message;
    body.error["code"] = ERR_VALIDATION;
    body.error["message"] = message;

    auto response = drogon::HttpResponse::newHttpJsonResponse(body.toJson());
    response->setStatusCode(drogon::k400BadRequest);
    return response;
}

// Parses the request body; returns null when the body is not a JSON object.
Json::Value parseJsonObject(const drogon::HttpRequestPtr &request)
{
    const auto jsonBody = request->getJsonObject();
    if (jsonBody && jsonBody->isObject())
    {
        return *jsonBody;
    }
    return Json::Value();
}
} // namespace

drogon::Task<drogon::HttpResponsePtr> GlController::validateJournal(
    drogon::HttpRequestPtr request)
{
    co_return business_desk::http::makeNotImplementedResponse(request);
}

drogon::Task<drogon::HttpResponsePtr> GlController::listAccountHeads(
    drogon::HttpRequestPtr request)
{
    auto plugin = app().getPlugin<gnp::plugins::BusinessDeskServicePlugin>();
    auto &glService = plugin->getGlService();

    const int pageNo = parseIntegerParam(request, "pageNo", 1, 1);
    const int pageSize = parseIntegerParam(request, "pageSize", 20, 1);
    const std::string query = request->getParameter("query");

    auto result = co_await glService.getAllAccountHeads(pageNo, pageSize, query);
    co_return toApiResponse(result, drogon::k200OK);
}

drogon::Task<drogon::HttpResponsePtr> GlController::createAccountHead(
    drogon::HttpRequestPtr request)
{
    const auto identity = business_desk::utils::extractAuditIdentity(request);
    const auto jsonBody = parseJsonObject(request);
    if (jsonBody.isNull())
    {
        co_return makeBadRequestResponse(
            request, "Expected a JSON object with the account head fields.");
    }

    business_desk::dto::AccountHeadDto dto;
    dto.fromJson(jsonBody);

    auto plugin = app().getPlugin<gnp::plugins::BusinessDeskServicePlugin>();
    auto &glService = plugin->getGlService();

    auto result = co_await glService.createAccountHead(dto, identity);
    co_return toApiResponse(result, drogon::k201Created);
}

drogon::Task<drogon::HttpResponsePtr> GlController::getAccountHead(
    drogon::HttpRequestPtr request,
    std::string)
{
    co_return business_desk::http::makeNotImplementedResponse(request);
}

drogon::Task<drogon::HttpResponsePtr> GlController::updateAccountHead(
    drogon::HttpRequestPtr request,
    std::string id)
{
    const auto identity = business_desk::utils::extractAuditIdentity(request);
    const auto jsonBody = parseJsonObject(request);
    if (jsonBody.isNull())
    {
        co_return makeBadRequestResponse(
            request, "Expected a JSON object with the account head fields.");
    }

    business_desk::dto::AccountHeadDto dto;
    dto.fromJson(jsonBody);

    auto plugin = app().getPlugin<gnp::plugins::BusinessDeskServicePlugin>();
    auto &glService = plugin->getGlService();

    auto result = co_await glService.updateAccountHead(dto, id, identity);
    co_return toApiResponse(result, drogon::k200OK);
}

drogon::Task<drogon::HttpResponsePtr> GlController::deleteAccountHead(
    drogon::HttpRequestPtr request,
    std::string id)
{
    const auto identity = business_desk::utils::extractAuditIdentity(request);
    auto plugin = app().getPlugin<gnp::plugins::BusinessDeskServicePlugin>();
    auto &glService = plugin->getGlService();

    auto result = co_await glService.deleteAccountHead(id, identity);
    co_return toApiResponse(result, drogon::k200OK);
}

drogon::Task<drogon::HttpResponsePtr> GlController::listAccountControls(
    drogon::HttpRequestPtr request)
{
    auto plugin = app().getPlugin<gnp::plugins::BusinessDeskServicePlugin>();
    auto &glService = plugin->getGlService();

    const int pageNo = parseIntegerParam(request, "pageNo", 1, 1);
    const int pageSize = parseIntegerParam(request, "pageSize", 20, 1);
    const std::string query = request->getParameter("query");

    auto result = co_await glService.getAllCoaControls(pageNo, pageSize, query);
    co_return toApiResponse(result, drogon::k200OK);
}

drogon::Task<drogon::HttpResponsePtr> GlController::createAccountControl(
    drogon::HttpRequestPtr request)
{
    const auto identity = business_desk::utils::extractAuditIdentity(request);
    const auto jsonBody = parseJsonObject(request);
    if (jsonBody.isNull())
    {
        co_return makeBadRequestResponse(
            request, "Expected a JSON object with the control header fields.");
    }

    business_desk::dto::ChartOfAccountControlDto dto;
    dto.fromJson(jsonBody);

    auto plugin = app().getPlugin<gnp::plugins::BusinessDeskServicePlugin>();
    auto &glService = plugin->getGlService();

    auto result = co_await glService.createCoaControl(dto, identity);
    co_return toApiResponse(result, drogon::k201Created);
}

drogon::Task<drogon::HttpResponsePtr> GlController::getAccountControl(
    drogon::HttpRequestPtr request,
    std::string)
{
    co_return business_desk::http::makeNotImplementedResponse(request);
}

drogon::Task<drogon::HttpResponsePtr> GlController::updateAccountControl(
    drogon::HttpRequestPtr request,
    std::string id)
{
    const auto identity = business_desk::utils::extractAuditIdentity(request);
    const auto jsonBody = parseJsonObject(request);
    if (jsonBody.isNull())
    {
        co_return makeBadRequestResponse(
            request, "Expected a JSON object with the control header fields.");
    }

    business_desk::dto::ChartOfAccountControlDto dto;
    dto.fromJson(jsonBody);

    auto plugin = app().getPlugin<gnp::plugins::BusinessDeskServicePlugin>();
    auto &glService = plugin->getGlService();

    auto result = co_await glService.updateCoaControl(dto, id, identity);
    co_return toApiResponse(result, drogon::k200OK);
}

drogon::Task<drogon::HttpResponsePtr> GlController::deleteAccountControl(
    drogon::HttpRequestPtr request,
    std::string id)
{
    const auto identity = business_desk::utils::extractAuditIdentity(request);
    auto plugin = app().getPlugin<gnp::plugins::BusinessDeskServicePlugin>();
    auto &glService = plugin->getGlService();

    auto result = co_await glService.deleteCoaControl(id, identity);
    co_return toApiResponse(result, drogon::k200OK);
}

drogon::Task<drogon::HttpResponsePtr> GlController::listAccountDetails(
    drogon::HttpRequestPtr request)
{
    auto plugin = app().getPlugin<gnp::plugins::BusinessDeskServicePlugin>();
    auto &glService = plugin->getGlService();

    const int pageNo = parseIntegerParam(request, "pageNo", 1, 1);
    const int pageSize = parseIntegerParam(request, "pageSize", 20, 1);
    const std::string query = request->getParameter("query");

    auto result = co_await glService.getAllCoaDetails(pageNo, pageSize, query);
    co_return toApiResponse(result, drogon::k200OK);
}

drogon::Task<drogon::HttpResponsePtr> GlController::createAccountDetail(
    drogon::HttpRequestPtr request)
{
    const auto identity = business_desk::utils::extractAuditIdentity(request);
    const auto jsonBody = parseJsonObject(request);
    if (jsonBody.isNull())
    {
        co_return makeBadRequestResponse(
            request, "Expected a JSON object with the detail account fields.");
    }

    business_desk::dto::ChartOfAccountDetailDto dto;
    dto.fromJson(jsonBody);

    auto plugin = app().getPlugin<gnp::plugins::BusinessDeskServicePlugin>();
    auto &glService = plugin->getGlService();

    auto result = co_await glService.createCoaDetail(dto, identity);
    co_return toApiResponse(result, drogon::k201Created);
}

drogon::Task<drogon::HttpResponsePtr> GlController::getAccountDetail(
    drogon::HttpRequestPtr request,
    std::string)
{
    co_return business_desk::http::makeNotImplementedResponse(request);
}

drogon::Task<drogon::HttpResponsePtr> GlController::updateAccountDetail(
    drogon::HttpRequestPtr request,
    std::string id)
{
    const auto identity = business_desk::utils::extractAuditIdentity(request);
    const auto jsonBody = parseJsonObject(request);
    if (jsonBody.isNull())
    {
        co_return makeBadRequestResponse(
            request, "Expected a JSON object with the detail account fields.");
    }

    business_desk::dto::ChartOfAccountDetailDto dto;
    dto.fromJson(jsonBody);

    auto plugin = app().getPlugin<gnp::plugins::BusinessDeskServicePlugin>();
    auto &glService = plugin->getGlService();

    auto result = co_await glService.updateCoaDetail(dto, id, identity);
    co_return toApiResponse(result, drogon::k200OK);
}

drogon::Task<drogon::HttpResponsePtr> GlController::deleteAccountDetail(
    drogon::HttpRequestPtr request,
    std::string id)
{
    const auto identity = business_desk::utils::extractAuditIdentity(request);
    auto plugin = app().getPlugin<gnp::plugins::BusinessDeskServicePlugin>();
    auto &glService = plugin->getGlService();

    auto result = co_await glService.deleteCoaDetail(id, identity);
    co_return toApiResponse(result, drogon::k200OK);
}

drogon::Task<drogon::HttpResponsePtr> GlController::listBankAccounts(
    drogon::HttpRequestPtr request)
{
    auto plugin = app().getPlugin<gnp::plugins::BusinessDeskServicePlugin>();
    auto &glService = plugin->getGlService();

    const int pageNo = parseIntegerParam(request, "pageNo", 1, 1);
    const int pageSize = parseIntegerParam(request, "pageSize", 20, 1);
    const std::string query = request->getParameter("query");

    auto result = co_await glService.getAllBankAccounts(pageNo, pageSize, query);
    co_return toApiResponse(result, drogon::k200OK);
}

drogon::Task<drogon::HttpResponsePtr> GlController::createBankAccount(
    drogon::HttpRequestPtr request)
{
    const auto identity = business_desk::utils::extractAuditIdentity(request);
    const auto jsonBody = parseJsonObject(request);
    if (jsonBody.isNull())
    {
        co_return makeBadRequestResponse(
            request, "Expected a JSON object with the bank account fields.");
    }

    business_desk::dto::BankAccountDto dto;
    dto.fromJson(jsonBody);

    auto plugin = app().getPlugin<gnp::plugins::BusinessDeskServicePlugin>();
    auto &glService = plugin->getGlService();

    auto result = co_await glService.createBankAccount(dto, identity);
    co_return toApiResponse(result, drogon::k201Created);
}

drogon::Task<drogon::HttpResponsePtr> GlController::updateBankAccount(
    drogon::HttpRequestPtr request,
    std::string id)
{
    const auto identity = business_desk::utils::extractAuditIdentity(request);
    const auto jsonBody = parseJsonObject(request);
    if (jsonBody.isNull())
    {
        co_return makeBadRequestResponse(
            request, "Expected a JSON object with the bank account fields.");
    }

    business_desk::dto::BankAccountDto dto;
    dto.fromJson(jsonBody);

    auto plugin = app().getPlugin<gnp::plugins::BusinessDeskServicePlugin>();
    auto &glService = plugin->getGlService();

    auto result = co_await glService.updateBankAccount(dto, id, identity);
    co_return toApiResponse(result, drogon::k200OK);
}

drogon::Task<drogon::HttpResponsePtr> GlController::deleteBankAccount(
    drogon::HttpRequestPtr request,
    std::string id)
{
    const auto identity = business_desk::utils::extractAuditIdentity(request);
    auto plugin = app().getPlugin<gnp::plugins::BusinessDeskServicePlugin>();
    auto &glService = plugin->getGlService();

    auto result = co_await glService.deleteBankAccount(id, identity);
    co_return toApiResponse(result, drogon::k200OK);
}

drogon::Task<drogon::HttpResponsePtr> GlController::listAccountingUnits(
    drogon::HttpRequestPtr request)
{
    auto plugin = app().getPlugin<gnp::plugins::BusinessDeskServicePlugin>();
    auto &glService = plugin->getGlService();

    const int pageNo = parseIntegerParam(request, "pageNo", 1, 1);
    const int pageSize = parseIntegerParam(request, "pageSize", 20, 1);
    const std::string query = request->getParameter("query");

    auto result = co_await glService.getAllAccountingUnits(pageNo, pageSize, query);
    co_return toApiResponse(result, drogon::k200OK);
}

drogon::Task<drogon::HttpResponsePtr> GlController::createAccountingUnit(
    drogon::HttpRequestPtr request)
{
    const auto identity = business_desk::utils::extractAuditIdentity(request);
    const auto jsonBody = parseJsonObject(request);
    if (jsonBody.isNull())
    {
        co_return makeBadRequestResponse(
            request, "Expected a JSON object with the accounting unit fields.");
    }

    business_desk::dto::AccountingUnitDto dto;
    dto.fromJson(jsonBody);

    auto plugin = app().getPlugin<gnp::plugins::BusinessDeskServicePlugin>();
    auto &glService = plugin->getGlService();

    auto result = co_await glService.createAccountingUnit(dto, identity);
    co_return toApiResponse(result, drogon::k201Created);
}

drogon::Task<drogon::HttpResponsePtr> GlController::updateAccountingUnit(
    drogon::HttpRequestPtr request,
    std::string id)
{
    const auto identity = business_desk::utils::extractAuditIdentity(request);
    const auto jsonBody = parseJsonObject(request);
    if (jsonBody.isNull())
    {
        co_return makeBadRequestResponse(
            request, "Expected a JSON object with the accounting unit fields.");
    }

    business_desk::dto::AccountingUnitDto dto;
    dto.fromJson(jsonBody);

    auto plugin = app().getPlugin<gnp::plugins::BusinessDeskServicePlugin>();
    auto &glService = plugin->getGlService();

    auto result = co_await glService.updateAccountingUnit(dto, id, identity);
    co_return toApiResponse(result, drogon::k200OK);
}

drogon::Task<drogon::HttpResponsePtr> GlController::deleteAccountingUnit(
    drogon::HttpRequestPtr request,
    std::string id)
{
    const auto identity = business_desk::utils::extractAuditIdentity(request);
    auto plugin = app().getPlugin<gnp::plugins::BusinessDeskServicePlugin>();
    auto &glService = plugin->getGlService();

    auto result = co_await glService.deleteAccountingUnit(id, identity);
    co_return toApiResponse(result, drogon::k200OK);
}
