#include "DmController.h"

#include "ApiResponseStub.h"

void DmController::asyncHandleHttpRequest(
    const HttpRequestPtr &request,
    std::function<void(const HttpResponsePtr &)> &&callback)
{
    callback(business_desk::http::makeNotImplementedResponse(request));
}
