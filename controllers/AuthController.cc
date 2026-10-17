#include "AuthController.h"

#include "dto/BaseApiResponse.h"
#include "dto/PasskeyLoginDto.h"
#include "plugins/BusinessDeskServicePlugin.h"


Task<HttpResponsePtr> AuthController::tenantLoginViaPasskeys(HttpRequestPtr req) {

    auto jsonBody = req->getJsonObject();

    if (!jsonBody) {
        business_desk::dto::BaseApiResponse response;
        response.success = false;
        response.error["message"] = "Invalid JSON body";
        auto resp = HttpResponse::newHttpJsonResponse(response.toJson());
        resp->setStatusCode(k400BadRequest);
        co_return resp;
    }

    business_desk::dto::PasskeyLoginDto dto;
    dto.fromJson(*jsonBody);

    auto plugin = app().getPlugin<business_desk::plugins::BusinessDeskServicePlugin>();
    auto &userService = plugin->getUserService();

    auto result = co_await userService.validateUserPasskeys(dto);
    auto resp = HttpResponse::newHttpJsonResponse(result.toJson());

    co_return resp;

}


Task<HttpResponsePtr> AuthController::hostLoginViaPasskeys(HttpRequestPtr req) {


}


Task<HttpResponsePtr> AuthController::hostSignIn(HttpRequestPtr req) {


}


Task<HttpResponsePtr> AuthController::tenantSignIn(HttpRequestPtr req) {


}