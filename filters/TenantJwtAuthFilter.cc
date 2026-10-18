#include "TenantJwtAuthFilter.h"
#include "JwtRequestAuth.h"

void TenantJwtAuthFilter::doFilter(const drogon::HttpRequestPtr &request,
                                 drogon::FilterCallback &&callback,
                                 drogon::FilterChainCallback &&next) {
    business_desk::auth::filter(request, std::move(callback), std::move(next), false);
}
