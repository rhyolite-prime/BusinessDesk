#include "PosController.h"

#include "ApiResponseStub.h"

void PosController::asyncHandleHttpRequest(
    const HttpRequestPtr &request,
    std::function<void(const HttpResponsePtr &)> &&callback)
{
    callback(business_desk::http::makeNotImplementedResponse(request));
}
