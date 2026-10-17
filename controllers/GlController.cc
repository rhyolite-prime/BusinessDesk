#include "GlController.h"
#include "constants/ErrorCodes.h"
#include "ApiResponseStub.h"
#include "plugins/BusinessDeskServicePlugin.h"

using namespace business_desk::constants;

drogon::Task<drogon::HttpResponsePtr> GlController::validateJournal(
    drogon::HttpRequestPtr request)
{
    auto plugin = app().getPlugin<gnp::plugins::BusinessDeskServicePlugin>();
    auto &glService = plugin->getGlService();

    co_return business_desk::http::makeNotImplementedResponse(request);
}

drogon::Task<drogon::HttpResponsePtr> GlController::listAccountHeads(
    drogon::HttpRequestPtr request)
{
    co_return business_desk::http::makeNotImplementedResponse(request);
}

drogon::Task<drogon::HttpResponsePtr> GlController::createAccountHead(drogon::HttpRequestPtr req)
{
    const auto jsonBody = req->getJsonObject();

    if (!jsonBody) {
        business_desk::dto::BaseApiResponse response;
        response.success = false;
        response.message = "Invalid JSON body.";
        response.error["code"] = ERR_VALIDATION;
        response.error["message"] = "Expected a JSON object with a question field.";
        auto httpResponse = HttpResponse::newHttpJsonResponse(response.toJson());
        httpResponse->setStatusCode(k400BadRequest);
        co_return httpResponse;
    }

    business_desk::dto::AccountHeadDto dto;
    dto.fromJson(*jsonBody);

    auto plugin = app().getPlugin<gnp::plugins::BusinessDeskServicePlugin>();
    auto &glService = plugin->getGlService();

    auto result = co_await glService.createAccountHead(dto);
    auto resp = HttpResponse::newHttpJsonResponse(result.toJson());
    co_return resp;

}

drogon::Task<drogon::HttpResponsePtr> GlController::getAccountHead(
    drogon::HttpRequestPtr request,
    std::string)
{
    co_return business_desk::http::makeNotImplementedResponse(request);
}

drogon::Task<drogon::HttpResponsePtr> GlController::updateAccountHead(
    drogon::HttpRequestPtr request,
    std::string)
{
    co_return business_desk::http::makeNotImplementedResponse(request);
}

drogon::Task<drogon::HttpResponsePtr> GlController::deleteAccountHead(
    drogon::HttpRequestPtr request,
    std::string)
{
    co_return business_desk::http::makeNotImplementedResponse(request);
}

drogon::Task<drogon::HttpResponsePtr> GlController::listAccountControls(
    drogon::HttpRequestPtr request)
{
    co_return business_desk::http::makeNotImplementedResponse(request);
}

drogon::Task<drogon::HttpResponsePtr> GlController::createAccountControl(
    drogon::HttpRequestPtr request)
{
    co_return business_desk::http::makeNotImplementedResponse(request);
}

drogon::Task<drogon::HttpResponsePtr> GlController::getAccountControl(
    drogon::HttpRequestPtr request,
    std::string)
{
    co_return business_desk::http::makeNotImplementedResponse(request);
}

drogon::Task<drogon::HttpResponsePtr> GlController::updateAccountControl(
    drogon::HttpRequestPtr request,
    std::string)
{
    co_return business_desk::http::makeNotImplementedResponse(request);
}

drogon::Task<drogon::HttpResponsePtr> GlController::deleteAccountControl(
    drogon::HttpRequestPtr request,
    std::string)
{
    co_return business_desk::http::makeNotImplementedResponse(request);
}

drogon::Task<drogon::HttpResponsePtr> GlController::listAccountDetails(
    drogon::HttpRequestPtr request)
{
    co_return business_desk::http::makeNotImplementedResponse(request);
}

drogon::Task<drogon::HttpResponsePtr> GlController::createAccountDetail(
    drogon::HttpRequestPtr request)
{
    co_return business_desk::http::makeNotImplementedResponse(request);
}

drogon::Task<drogon::HttpResponsePtr> GlController::getAccountDetail(
    drogon::HttpRequestPtr request,
    std::string)
{
    co_return business_desk::http::makeNotImplementedResponse(request);
}

drogon::Task<drogon::HttpResponsePtr> GlController::updateAccountDetail(
    drogon::HttpRequestPtr request,
    std::string)
{
    co_return business_desk::http::makeNotImplementedResponse(request);
}

drogon::Task<drogon::HttpResponsePtr> GlController::deleteAccountDetail(
    drogon::HttpRequestPtr request,
    std::string)
{
    co_return business_desk::http::makeNotImplementedResponse(request);
}
