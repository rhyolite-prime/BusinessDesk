#include "FaController.h"

#include "ApiResponseStub.h"

void FaController::asyncHandleHttpRequest(
    const HttpRequestPtr &request,
    std::function<void(const HttpResponsePtr &)> &&callback)
{
    callback(business_desk::http::makeNotImplementedResponse(request));
}
