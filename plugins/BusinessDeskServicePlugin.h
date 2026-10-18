/**
 *
 *  BusinessDeskServicePlugin.h
 *
 */

#pragma once

#include <drogon/plugins/Plugin.h>

#include "domain_services/gl/GlService.h"
#include "domain_services/users/UserService.h"
#include "domain_services/tenants/TenantService.h"

namespace business_desk::plugins {
    class BusinessDeskServicePlugin : public drogon::Plugin<BusinessDeskServicePlugin>
    {
    public:
        BusinessDeskServicePlugin() = default;
        ~BusinessDeskServicePlugin() override = default;
        /// This method must be called by drogon to initialize and start the plugin.
        /// It must be implemented by the user.
        void initAndStart(const Json::Value &config) override;

        /// This method must be called by drogon to shutdown the plugin.
        /// It must be implemented by the user.
        void shutdown() override;

        domain_services::GlService &getGlService() { return glService_; }
        domain_services::UserService &getUserService() { return userService_; }
        domain_services::TenantService &getTenantService() { return tenantService_; }


    private:
        domain_services::GlService glService_;
        domain_services::UserService userService_;
        domain_services::TenantService tenantService_;
    };

}
