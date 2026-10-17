#pragma once

#include "dto/BaseApiResponse.h"

#include <drogon/HttpRequest.h>
#include <drogon/HttpResponse.h>

namespace business_desk::http
{
// Drogon handlers return HttpResponsePtr, with BaseApiResponse as the JSON body.
inline drogon::HttpResponsePtr makeNotImplementedResponse(
    const drogon::HttpRequestPtr &request)
{
    dto::BaseApiResponse body;
    if (request)
    {
        body.targetUrl = request->path();
    }
    body.message = "This endpoint is not implemented yet.";
    body.error = Json::Value(Json::objectValue);
    body.error["code"] = "not_implemented";
    body.error["message"] = body.message;

    auto response = drogon::HttpResponse::newHttpJsonResponse(body.toJson());
    response->setStatusCode(drogon::k501NotImplemented);
    return response;
}
}  // namespace business_desk::http
