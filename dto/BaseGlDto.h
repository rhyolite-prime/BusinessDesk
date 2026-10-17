//
// Created by Emmanuel Addo-Odame on 16/10/2026.
//

#ifndef BUSINESSDESKAPI_BASEGLDTO_H
#define BUSINESSDESKAPI_BASEGLDTO_H

#include <json/json.h>

#include <algorithm>
#include <cctype>
#include <exception>
#include <string>

#include "constants/BusinessDeskConsts.h"

namespace business_desk::dto {

    // Normalizes a free-form token for case/space-insensitive comparison.
    inline std::string normalizeToken(const std::string &value) {
        std::string normalized;
        normalized.reserve(value.size());
        for (char c : value) {
            if (!std::isspace(static_cast<unsigned char>(c))) {
                normalized.push_back(static_cast<char>(std::tolower(static_cast<unsigned char>(c))));
            }
        }
        return normalized;
    }

    // Maps a standard account type name ("Asset", "Assets", ...) or numeric
    // code ("0".."4") onto the corresponding AccountType code. Returns
    // AccountType::Unknown (-1) when the value cannot be resolved.
    inline int32_t parseStandardAccountType(const Json::Value &value) {
        if (value.isInt()) {
            return value.asInt();
        }
        if (value.isUInt()) {
            return static_cast<int32_t>(value.asUInt());
        }
        if (value.isString()) {
            std::string normalized = normalizeToken(value.asString());
            if (normalized.size() > 1 && normalized.back() == 's') {
                normalized.pop_back();
            }
            if (normalized == "asset") {
                return static_cast<int32_t>(constants::AccountType::Asset);
            }
            if (normalized == "liability") {
                return static_cast<int32_t>(constants::AccountType::Liability);
            }
            if (normalized == "equity") {
                return static_cast<int32_t>(constants::AccountType::Equity);
            }
            if (normalized == "revenue") {
                return static_cast<int32_t>(constants::AccountType::Revenue);
            }
            if (normalized == "expense") {
                return static_cast<int32_t>(constants::AccountType::Expense);
            }
            try {
                return std::stoi(normalized);
            } catch (const std::exception &) {
                return static_cast<int32_t>(constants::AccountType::Unknown);
            }
        }
        return static_cast<int32_t>(constants::AccountType::Unknown);
    }

    class AccountHeadDto {
    public:

        AccountHeadDto() = default;

        void fromJson(const Json::Value& json);

        // Getters
        [[nodiscard]] const std::string& getAccountHeadName() const { return accountHeadName_; }
        [[nodiscard]] const std::string& getParentHeadId() const { return parentHeadId_; }
        [[nodiscard]] int32_t getAccountType() const { return accountType_; }
        [[nodiscard]] bool getIsActive() const { return isActive_; }

        // Setters
        void setAccountHeadName(const std::string& value) { accountHeadName_ = value; }
        void setParentHeadId(const std::string& value) { parentHeadId_ = value; }
        void setAccountType(const int32_t value) { accountType_ = value; }
        void setIsActive(const bool value) { isActive_ = value; }

    private:
        std::string accountHeadName_;
        std::string parentHeadId_;
        int32_t accountType_ {static_cast<int32_t>(constants::AccountType::Asset)};
        bool isActive_ {true};

    };

    inline void AccountHeadDto::fromJson(const Json::Value& json) {

        if (json.isMember("accountHeadName") && json["accountHeadName"].isString()) {
            accountHeadName_ = json["accountHeadName"].asString();
        }

        if (json.isMember("parentHeadId") && json["parentHeadId"].isString()) {
            parentHeadId_ = json["parentHeadId"].asString();
        }

        if (json.isMember("accountType")) {
            accountType_ = parseStandardAccountType(json["accountType"]);
        }


    }

    class BankAccountDto {
    public:

        BankAccountDto() = default;

        void fromJson(const Json::Value& json);

        // Getters
        [[nodiscard]] const std::string& getBankId() const { return bank_id_; }
        [[nodiscard]] const std::string& getBankName() const { return bank_name_; }
        [[nodiscard]] const std::string& getBankBranchId() const { return bank_branch_id_; }
        [[nodiscard]] const std::string& getBankBranchName() const { return bank_branch_name_; }
        [[nodiscard]] const std::string& getAccountId() const { return account_id_; }
        [[nodiscard]] const std::string& getAccountName() const { return account_name_; }
        [[nodiscard]] const std::string& getAddress() const { return address_; }
        [[nodiscard]] const std::string& getLocation() const { return location_; }
        [[nodiscard]] const std::string& getAccountNo() const { return account_no_; }
        [[nodiscard]] const std::string& getAccountType() const { return account_type_; }
        [[nodiscard]] const std::string& getCurrencyId() const { return currency_id_; }
        [[nodiscard]] const std::string& getCurrencyName() const { return currency_name_; }
        [[nodiscard]] const std::string& getCurrencyCode() const { return currency_code_; }
        [[nodiscard]] const std::string& getContactPerson() const { return contact_person_; }
        [[nodiscard]] const std::string& getContactNo() const { return contact_no_; }
        [[nodiscard]] const std::string& getChequeBookStart() const { return cheque_book_start_; }
        [[nodiscard]] const std::string& getChequeBookEnd() const { return cheque_book_end_; }
        [[nodiscard]] const std::string& getDateOpened() const { return date_opened_; }

        // Setters
        void setBankId(const std::string& value) { bank_id_ = value; }
        void setBankName(const std::string& value) { bank_name_ = value; }
        void setBankBranchId(const std::string& value) { bank_branch_id_ = value; }
        void setBankBranchName(const std::string& value) { bank_branch_name_ = value; }
        void setAccountId(const std::string& value) { account_id_ = value; }
        void setAccountName(const std::string& value) { account_name_ = value; }
        void setAddress(const std::string& value) { address_ = value; }
        void setLocation(const std::string& value) { location_ = value; }
        void setAccountNo(const std::string& value) { account_no_ = value; }
        void setAccountType(const std::string& value) { account_type_ = value; }
        void setCurrencyId(const std::string& value) { currency_id_ = value; }
        void setCurrencyName(const std::string& value) { currency_name_ = value; }
        void setCurrencyCode(const std::string& value) { currency_code_ = value; }
        void setContactPerson(const std::string& value) { contact_person_ = value; }
        void setContactNo(const std::string& value) { contact_no_ = value; }
        void setChequeBookStart(const std::string& value) { cheque_book_start_ = value; }
        void setChequeBookEnd(const std::string& value) { cheque_book_end_ = value; }
        void setDateOpened(const std::string& value) { date_opened_ = value; }

    private:
        std::string bank_id_;
        std::string bank_name_;
        std::string bank_branch_id_;
        std::string bank_branch_name_;
        std::string account_id_;
        std::string account_name_;
        std::string address_;
        std::string location_;
        std::string account_no_;
        std::string account_type_;
        std::string currency_id_;
        std::string currency_name_;
        std::string currency_code_;
        std::string contact_person_;
        std::string contact_no_;
        std::string cheque_book_start_;
        std::string cheque_book_end_;
        std::string date_opened_;

    };

    inline void BankAccountDto::fromJson(const Json::Value& json) {

        if (json.isMember("bankId") && json["bankId"].isString()) {
            bank_id_ = json["bankId"].asString();
        }

        if (json.isMember("bankName") && json["bankName"].isString()) {
            bank_name_ = json["bankName"].asString();
        }

        if (json.isMember("bankBranchId") && json["bankBranchId"].isString()) {
            bank_branch_id_ = json["bankBranchId"].asString();
        }

        if (json.isMember("bankBranchName") && json["bankBranchName"].isString()) {
            bank_branch_name_ = json["bankBranchName"].asString();
        }

        if (json.isMember("accountId") && json["accountId"].isString()) {
            account_id_ = json["accountId"].asString();
        }

        if (json.isMember("accountName") && json["accountName"].isString()) {
            account_name_ = json["accountName"].asString();
        }

        if (json.isMember("address") && json["address"].isString()) {
            address_ = json["address"].asString();
        }
        if (json.isMember("location") && json["location"].isString()) {
            location_ = json["location"].asString();
        }
        if (json.isMember("accountNo") && json["accountNo"].isString()) {
            account_no_ = json["accountNo"].asString();
        }
        if (json.isMember("accountType") && json["accountType"].isString()) {
            account_type_ = json["accountType"].asString();
        }
        if (json.isMember("currencyId") && json["currencyId"].isString()) {
            currency_id_ = json["currencyId"].asString();
        }
        if (json.isMember("currencyName") && json["currencyName"].isString()) {
            currency_name_ = json["currencyName"].asString();
        }
        if (json.isMember("currencyCode") && json["currencyCode"].isString()) {
            currency_code_ = json["currencyCode"].asString();
        }
        if (json.isMember("contactPerson") && json["contactPerson"].isString()) {
            contact_person_ = json["contactPerson"].asString();
        }
        if (json.isMember("contactNo") && json["contactNo"].isString()) {
            contact_no_ = json["contactNo"].asString();
        }
        if (json.isMember("chequeBookStart") && json["chequeBookStart"].isString()) {
            cheque_book_start_ = json["chequeBookStart"].asString();
        }
        if (json.isMember("chequeBookEnd") && json["chequeBookEnd"].isString()) {
            cheque_book_end_ = json["chequeBookEnd"].asString();
        }
        if (json.isMember("dateOpened") && json["dateOpened"].isString()) {
            date_opened_ = json["dateOpened"].asString();
        }


    }

    class ChartOfAccountControlDto {
    public:

        ChartOfAccountControlDto() = default;

        void fromJson(const Json::Value& json);

        // Getters
        [[nodiscard]] const std::string& getName() const { return name_; }
        [[nodiscard]] int getMinAccount() const { return min_account_; }
        [[nodiscard]] int getMaxAccount() const { return max_account_; }
        [[nodiscard]] const std::string& getAccountHeadId() const { return account_head_id_; }
        [[nodiscard]] int getAccountType() const { return account_type_; }
        [[nodiscard]] const std::string& getParentControlId() const { return parent_control_id_; }

        // Setters
        void setName(const std::string& value) { name_ = value; }
        void setMinAccount(int value) { min_account_ = value; }
        void setMaxAccount(int value) { max_account_ = value; }
        void setAccountHeadId(const std::string& value) { account_head_id_ = value; }
        void setAccountType(int value) { account_type_ = value; }
        void setParentControlId(const std::string& value) { parent_control_id_ = value; }

    private:
        std::string name_;
        int min_account_ = 0;
        int max_account_ = 0;
        std::string account_head_id_;
        int account_type_ = 0;
        std::string parent_control_id_;

    };

    inline void ChartOfAccountControlDto::fromJson(const Json::Value& json) {

        if (json.isMember("name") && json["name"].isString()) {
            name_ = json["name"].asString();
        }

        if (json.isMember("minAccount") && json["minAccount"].isInt()) {
            min_account_ = json["minAccount"].asInt();
        }

        if (json.isMember("maxAccount") && json["maxAccount"].isInt()) {
            max_account_ = json["maxAccount"].asInt();
        }

        if (json.isMember("chartOfAccountId") && json["chartOfAccountId"].isString()) {
            account_head_id_ = json["chartOfAccountId"].asString();
        }

        if (json.isMember("accountType") && json["accountType"].isInt()) {
            account_type_ = json["accountType"].asInt();
        }

        if (json.isMember("parentControlId") && json["parentControlId"].isString()) {
            parent_control_id_ = json["parentControlId"].asString();
        }

    }

    class ChartOfAccountDetailDto {
    public:

        ChartOfAccountDetailDto() = default;

        void fromJson(const Json::Value& json);

        // Getters
        [[nodiscard]] const std::string& getAccountName() const { return account_name_; }
        [[nodiscard]] int getAccountNo() const { return account_no_; }
        [[nodiscard]] int getStatus() const { return status_; }
        [[nodiscard]] const std::string& getAccountControlId() const { return account_control_id_; }
        [[nodiscard]] const std::string& getAccountControlName() const { return account_control_name_; }
        [[nodiscard]] const std::string& getCurrencyId() const { return currency_id_; }
        [[nodiscard]] const std::string& getCurrencyName() const { return currency_name_; }
        [[nodiscard]] const std::string& getCurrencyCode() const { return currency_code_; }
        [[nodiscard]] double getCurrentBalance() const { return current_balance_; }
        [[nodiscard]] double getCurrentForeignBalance() const { return current_foreign_balance_; }

        // Setters
        void setAccountName(const std::string& value) { account_name_ = value; }
        void setAccountNo(int value) { account_no_ = value; }
        void setStatus(int value) { status_ = value; }
        void setAccountControlId(const std::string& value) { account_control_id_ = value; }
        void setAccountControlName(const std::string& value) { account_control_name_ = value; }
        void setCurrencyId(const std::string& value) { currency_id_ = value; }
        void setCurrencyName(const std::string& value) { currency_name_ = value; }
        void setCurrencyCode(const std::string& value) { currency_code_ = value; }
        void setCurrentBalance(double value) { current_balance_ = value; }
        void setCurrentForeignBalance(double value) { current_foreign_balance_ = value; }

    private:
        std::string account_name_;
        int account_no_ = 0;
        int status_ = static_cast<int>(constants::AccountStatus::Active);  // enum AccountStatus mapped to int
        std::string account_control_id_;       // Guid -> std::string
        std::string account_control_name_;
        std::string currency_id_;              // Guid -> std::string
        std::string currency_name_;
        std::string currency_code_;
        double current_balance_ = 0.0;         // decimal -> double
        double current_foreign_balance_ = 0.0; // decimal -> double

    };

    inline void ChartOfAccountDetailDto::fromJson(const Json::Value& json) {

        if (json.isMember("accountName") && json["accountName"].isString()) {
            account_name_ = json["accountName"].asString();
        }

        if (json.isMember("accountNo") && json["accountNo"].isInt()) {
            account_no_ = json["accountNo"].asInt();
        }

        if (json.isMember("status")) {
            if (json["status"].isInt()) {
                status_ = json["status"].asInt();
            } else if (json["status"].isString()) {
                const std::string normalizedStatus = normalizeToken(json["status"].asString());
                if (normalizedStatus == "active") {
                    status_ = static_cast<int>(constants::AccountStatus::Active);
                } else if (normalizedStatus == "inactive") {
                    status_ = static_cast<int>(constants::AccountStatus::Inactive);
                } else {
                    try {
                        status_ = std::stoi(normalizedStatus);
                    } catch (const std::exception &) {
                        status_ = static_cast<int>(constants::AccountStatus::Unknown);
                    }
                }
            }
        }

        if (json.isMember("accountControlId") && json["accountControlId"].isString()) {
            account_control_id_ = json["accountControlId"].asString();
        }

        if (json.isMember("accountControlName") && json["accountControlName"].isString()) {
            account_control_name_ = json["accountControlName"].asString();
        }

        if (json.isMember("currencyId") && json["currencyId"].isString()) {
            currency_id_ = json["currencyId"].asString();
        }

        if (json.isMember("currencyName") && json["currencyName"].isString()) {
            currency_name_ = json["currencyName"].asString();
        }

        if (json.isMember("currencyCode") && json["currencyCode"].isString()) {
            currency_code_ = json["currencyCode"].asString();
        }


        if (json.isMember("currentBalance")) {
            if (json["currentBalance"].isDouble()) {
                current_balance_ = json["currentBalance"].asDouble();
            } else if (json["currentBalance"].isInt()) {
                current_balance_ = static_cast<double>(json["currentBalance"].asInt());
            } else if (json["currentBalance"].isString()) {
                current_balance_ = std::stod(json["currentBalance"].asString());
            }
        }

        if (json.isMember("currentForeignBalance")) {
            if (json["currentForeignBalance"].isDouble()) {
                current_foreign_balance_ = json["currentForeignBalance"].asDouble();
            } else if (json["currentForeignBalance"].isInt()) {
                current_foreign_balance_ = static_cast<double>(json["currentForeignBalance"].asInt());
            } else if (json["currentForeignBalance"].isString()) {
                current_foreign_balance_ = std::stod(json["currentForeignBalance"].asString());
            }
        }


    }

    class AccountingUnitDto {
    public:

        AccountingUnitDto() = default;

        void fromJson(const Json::Value& json);

        // Getters
        [[nodiscard]] const std::string& getCode() const { return code_; }
        [[nodiscard]] const std::string& getName() const { return name_; }
        [[nodiscard]] const std::string& getBaseCurrencyId() const { return base_currency_id_; }
        [[nodiscard]] const std::string& getTimeZone() const { return time_zone_; }
        [[nodiscard]] int getFiscalYearStartMonth() const { return fiscal_year_start_month_; }
        [[nodiscard]] bool getIsActive() const { return is_active_; }

        // Setters
        void setCode(const std::string& value) { code_ = value; }
        void setName(const std::string& value) { name_ = value; }
        void setBaseCurrencyId(const std::string& value) { base_currency_id_ = value; }
        void setTimeZone(const std::string& value) { time_zone_ = value; }
        void setFiscalYearStartMonth(const int value) { fiscal_year_start_month_ = value; }
        void setIsActive(const bool value) { is_active_ = value; }

    private:
        std::string code_;
        std::string name_;
        std::string base_currency_id_;
        std::string time_zone_ {"UTC"};
        int fiscal_year_start_month_ {1};
        bool is_active_ {true};
    };

}
#endif //BUSINESSDESKAPI_BASEGLDTO_H
