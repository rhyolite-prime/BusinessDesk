#include "ApController.h"

#include "ApiResponseStub.h"

void ApController::asyncHandleHttpRequest(
    const HttpRequestPtr &request,
    std::function<void(const HttpResponsePtr &)> &&callback)
{
    callback(business_desk::http::makeNotImplementedResponse(request));
}
