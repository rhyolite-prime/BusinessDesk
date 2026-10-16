//
// Created by Emmanuel Addo-Odame on 16/10/2026.
//

#ifndef BUSINESSDESKAPI_BASEGLDTO_H
#define BUSINESSDESKAPI_BASEGLDTO_H

#include <json/json.h>

namespace business_desk::dto {

    class AccountHeadDto {
    public:

        AccountHeadDto() = default;

        void fromJson(const Json::Value& json);

        // Getters
        [[nodiscard]] const std::string& getApiUserId() const { return api_user_id_; }
        [[nodiscard]] const std::string& getApiUserKeyId() const { return api_user_key_id_; }
        [[nodiscard]] const std::string& getSubscriptionKey() const { return subscription_key_id_; }

        // Setters
        void setApiUserId(const std::string& value) { api_user_id_ = value; }
        void setApiUserKeyId(const std::string& value) { api_user_key_id_ = value; }
        void setSubscriptionKey(const std::string& value) { subscription_key_id_ = value; }

    private:
        std::string api_user_id_;
        std::string api_user_key_id_;
        std::string subscription_key_id_;

    };

    inline void AccountHeadDto::fromJson(const Json::Value& json) {

        if (json.isMember("apiUserId") && json["apiUserId"].isString()) {
            api_user_id_ = json["apiUserId"].asString();
        }

        if (json.isMember("apiUserKeyId") && json["apiUserKeyId"].isString()) {
            api_user_key_id_ = json["apiUserKeyId"].asString();
        }

        if (json.isMember("subscriptionKey") && json["subscriptionKey"].isString()) {
            subscription_key_id_ = json["subscriptionKey"].asString();
        }


    }

    class BankAccountDto {
    public:

        BankAccountDto() = default;

        void fromJson(const Json::Value& json);

        // Getters
        [[nodiscard]] const std::string& getApiUserId() const { return api_user_id_; }
        [[nodiscard]] const std::string& getApiUserKeyId() const { return api_user_key_id_; }
        [[nodiscard]] const std::string& getSubscriptionKey() const { return subscription_key_id_; }

        // Setters
        void setApiUserId(const std::string& value) { api_user_id_ = value; }
        void setApiUserKeyId(const std::string& value) { api_user_key_id_ = value; }
        void setSubscriptionKey(const std::string& value) { subscription_key_id_ = value; }

    private:
        std::string api_user_id_;
        std::string api_user_key_id_;
        std::string subscription_key_id_;

    };

    inline void BankAccountDto::fromJson(const Json::Value& json) {

        if (json.isMember("apiUserId") && json["apiUserId"].isString()) {
            api_user_id_ = json["apiUserId"].asString();
        }

        if (json.isMember("apiUserKeyId") && json["apiUserKeyId"].isString()) {
            api_user_key_id_ = json["apiUserKeyId"].asString();
        }

        if (json.isMember("subscriptionKey") && json["subscriptionKey"].isString()) {
            subscription_key_id_ = json["subscriptionKey"].asString();
        }


    }


    class ChartOfAccountControlDto {
    public:

        ChartOfAccountControlDto() = default;

        void fromJson(const Json::Value& json);

        // Getters
        [[nodiscard]] const std::string& getApiUserId() const { return api_user_id_; }
        [[nodiscard]] const std::string& getApiUserKeyId() const { return api_user_key_id_; }
        [[nodiscard]] const std::string& getSubscriptionKey() const { return subscription_key_id_; }

        // Setters
        void setApiUserId(const std::string& value) { api_user_id_ = value; }
        void setApiUserKeyId(const std::string& value) { api_user_key_id_ = value; }
        void setSubscriptionKey(const std::string& value) { subscription_key_id_ = value; }

    private:
        std::string api_user_id_;
        std::string api_user_key_id_;
        std::string subscription_key_id_;

    };

    inline void ChartOfAccountControlDto::fromJson(const Json::Value& json) {

        if (json.isMember("apiUserId") && json["apiUserId"].isString()) {
            api_user_id_ = json["apiUserId"].asString();
        }

        if (json.isMember("apiUserKeyId") && json["apiUserKeyId"].isString()) {
            api_user_key_id_ = json["apiUserKeyId"].asString();
        }

        if (json.isMember("subscriptionKey") && json["subscriptionKey"].isString()) {
            subscription_key_id_ = json["subscriptionKey"].asString();
        }


    }

    class ChartOfAccountDetailDto {
    public:

        ChartOfAccountDetailDto() = default;

        void fromJson(const Json::Value& json);

        // Getters
        [[nodiscard]] const std::string& getApiUserId() const { return api_user_id_; }
        [[nodiscard]] const std::string& getApiUserKeyId() const { return api_user_key_id_; }
        [[nodiscard]] const std::string& getSubscriptionKey() const { return subscription_key_id_; }

        // Setters
        void setApiUserId(const std::string& value) { api_user_id_ = value; }
        void setApiUserKeyId(const std::string& value) { api_user_key_id_ = value; }
        void setSubscriptionKey(const std::string& value) { subscription_key_id_ = value; }

    private:
        std::string api_user_id_;
        std::string api_user_key_id_;
        std::string subscription_key_id_;

    };

    inline void ChartOfAccountDetailDto::fromJson(const Json::Value& json) {

        if (json.isMember("apiUserId") && json["apiUserId"].isString()) {
            api_user_id_ = json["apiUserId"].asString();
        }

        if (json.isMember("apiUserKeyId") && json["apiUserKeyId"].isString()) {
            api_user_key_id_ = json["apiUserKeyId"].asString();
        }

        if (json.isMember("subscriptionKey") && json["subscriptionKey"].isString()) {
            subscription_key_id_ = json["subscriptionKey"].asString();
        }


    }

}
#endif //BUSINESSDESKAPI_BASEGLDTO_H
