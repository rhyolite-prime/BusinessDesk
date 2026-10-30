#include "HostJwtAuthFilter.h"
#include "JwtRequestAuth.h"

void HostJwtAuthFilter::doFilter(const drogon::HttpRequestPtr &request,
                               drogon::FilterCallback &&callback,
                               drogon::FilterChainCallback &&next) {
    business_desk::auth::filter(request, std::move(callback), std::move(next), true);
}
