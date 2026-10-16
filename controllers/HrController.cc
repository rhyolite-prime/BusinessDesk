#include "HrController.h"

#include "ApiResponseStub.h"

void HrController::asyncHandleHttpRequest(
    const HttpRequestPtr &request,
    std::function<void(const HttpResponsePtr &)> &&callback)
{
    callback(business_desk::http::makeNotImplementedResponse(request));
}
