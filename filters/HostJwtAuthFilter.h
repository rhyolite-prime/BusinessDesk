/**
 *
 *  HostJwtAuthFilter.h
 *
 */

#pragma once

#include <drogon/HttpFilter.h>
using namespace drogon;



class HostJwtAuthFilter : public HttpFilter<HostJwtAuthFilter>
{
  public:
    HostJwtAuthFilter() {}
    void doFilter(const HttpRequestPtr &req,
                  FilterCallback &&fcb,
                  FilterChainCallback &&fccb) override;
};


