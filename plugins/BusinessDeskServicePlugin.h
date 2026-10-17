/**
 *
 *  BusinessDeskServicePlugin.h
 *
 */

#pragma once

#include <drogon/plugins/Plugin.h>

#include "domain_services/gl/GlService.h"

namespace gnp::plugins {
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

        business_desk::domain_services::GlService &getGlService() { return glService_; }


    private:
        business_desk::domain_services::GlService glService_;
    };

}
