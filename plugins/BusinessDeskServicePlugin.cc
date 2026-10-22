/**
 *
 *  BusinessDeskServicePlugin.cc
 *
 */

#include "BusinessDeskServicePlugin.h"

using namespace drogon;

namespace business_desk::plugins {

void BusinessDeskServicePlugin::initAndStart(const Json::Value &config)
{
    (void)config; /// config intentionally unused; plugin needs no configuration
}

void BusinessDeskServicePlugin::shutdown()
{
    /// Shutdown the plugin
}

} // namespace business_desk::plugins
