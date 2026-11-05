/**
 *
 *  TenantJwtAuthFilter.h
 *
 */

#pragma once

#include <drogon/HttpFilter.h>
using namespace drogon;



class TenantJwtAuthFilter : public HttpFilter<TenantJwtAuthFilter>
{
  public:
    TenantJwtAuthFilter() {}
    void doFilter(const HttpRequestPtr &req,
                  FilterCallback &&fcb,
                  FilterChainCallback &&fccb) override;
};


