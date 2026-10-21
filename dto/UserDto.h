//
// Created by Emmanuel Addo-Odame on 17/10/2026.
//

#ifndef BUSINESSDESKAPI_USERDTO_H
#define BUSINESSDESKAPI_USERDTO_H
#include <json/json.h>

namespace business_desk::dto {

    class UserDto {

    public:

        UserDto() = default;

        void fromJson(const Json::Value& json);

        // Getters
        [[nodiscard]] const std::string& getFirstName() const { return first_name_; }
        [[nodiscard]] const std::string& getLastName() const { return last_name_; }
        [[nodiscard]] const std::string& getEmail() const { return email_; }
        [[nodiscard]] const std::string& getUsername() const { return username_; }
        [[nodiscard]] const std::string& getPassword() const { return password_; }
        [[nodiscard]] const std::string& getPhoneNumber() const { return phone_number_; }
        [[nodiscard]] const std::string& getCountry() const { return country_; }

        // Setters
        void setFirstName(const std::string& value) { first_name_ = value; }
        void setLastName(const std::string& value) { last_name_ = value; }
        void setEmail(const std::string& value) { email_ = value; }
        void setUsername(const std::string& value) { username_ = value; }
        void setPassword(const std::string& value) { password_ = value; }
        void setPhoneNumber(const std::string& value) { phone_number_ = value; }
        void setCountry(const std::string& value) { country_ = value; }


    private:

        std::string first_name_;
        std::string last_name_;
        std::string username_;
        std::string email_;
        std::string password_;
        std::string phone_number_;
        std::string country_;
    };

    inline void UserDto::fromJson(const Json::Value& json) {

        if (json.isMember("firstName") && !json["firstName"].isNull()) {
            first_name_ = json["firstName"].asString();
        }

        if (json.isMember("lastName") && !json["lastName"].isNull()) {
            last_name_ = json["lastName"].asString();
        }

        if (json.isMember("username") && !json["username"].isNull()) {
            username_ = json["username"].asString();
        }

         if (json.isMember("email") && !json["email"].isNull()) {
             email_ = json["email"].asString();
         }

        if (json.isMember("password") && !json["password"].isNull()) {
            password_ = json["password"].asString();
        }

        if (json.isMember("phoneNumber") && !json["phoneNumber"].isNull()) {
            phone_number_ = json["phoneNumber"].asString();
        }

        if (json.isMember("country") && !json["country"].isNull()) {
            country_ = json["country"].asString();
        }

    }

    // Tenant input is kept here for source compatibility with the existing WIP.
    class TenantDto {
    public:
        void fromJson(const Json::Value &json) {
            *this = TenantDto{};
            if (json.isMember("tenancyName")) setTenancyName(json["tenancyName"].asString());
            if (json.isMember("name")) setName(json["name"].asString());
            if (json.isMember("adminEmailAddress")) setAdminEmailAddress(json["adminEmailAddress"].asString());
            if (json.isMember("defaultCurrencyId")) setDefaultCurrencyId(json["defaultCurrencyId"].asString());
            if (json.isMember("connectionString")) {
                hasConnectionString_ = true;
                if (!json["connectionString"].isNull()) connectionString_ = json["connectionString"].asString();
            }
        }
        const std::string &getDefaultCurrencyId() const { return defaultCurrencyId_; }
        bool hasDefaultCurrencyId() const { return hasDefaultCurrencyId_; }
        void setDefaultCurrencyId(const std::string &value) { defaultCurrencyId_=value; hasDefaultCurrencyId_=true; }
        const std::string &getTenancyName() const { return tenancyName_; }
        const std::string &getName() const { return name_; }
        const std::string &getAdminEmailAddress() const { return adminEmailAddress_; }
        const std::string &getConnectionString() const { return connectionString_; }
        bool hasTenancyName() const { return hasTenancyName_; }
        bool hasName() const { return hasName_; }
        bool hasAdminEmailAddress() const { return hasAdminEmailAddress_; }
        bool hasConnectionString() const { return hasConnectionString_; }
        void setTenancyName(const std::string &value) { tenancyName_=value; hasTenancyName_=true; }
        void setName(const std::string &value) { name_=value; hasName_=true; }
        void setAdminEmailAddress(const std::string &value) { adminEmailAddress_=value; hasAdminEmailAddress_=true; }
        void setConnectionString(const std::string &value) { connectionString_=value; hasConnectionString_=true; }
    private:
        std::string tenancyName_, name_, adminEmailAddress_, connectionString_, defaultCurrencyId_;
        bool hasDefaultCurrencyId_=false;
        bool hasTenancyName_=false, hasName_=false, hasAdminEmailAddress_=false, hasConnectionString_=false;
    };
}
#endif //BUSINESSDESKAPI_USERDTO_H
