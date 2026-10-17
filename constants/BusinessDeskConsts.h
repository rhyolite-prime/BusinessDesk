//
// Created by Emmanuel Addo-Odame on 16/10/2026.
//

#ifndef BUSINESSDESKAPI_BUSINESSDESKCONSTS_H
#define BUSINESSDESKAPI_BUSINESSDESKCONSTS_H

namespace business_desk::constants {

    enum class AccountStatus : int {
        Unknown   = -1,
        Inactive  = 0,
        Active    = 1,
        Suspended = 2,
        Closed    = 3,
    };

    enum class AccountType : int {
        Unknown       = -1,
        Asset         = 0,
        Liability     = 1,
        Equity        = 2,
        Revenue       = 3,
        Expense       = 4,

    };

    inline AccountStatus toAccountStatus(int value) {
        switch (value) {
            case 0: return AccountStatus::Inactive;
            case 1: return AccountStatus::Active;
            case 2: return AccountStatus::Suspended;
            case 3: return AccountStatus::Closed;
            default: return AccountStatus::Unknown;
        }
    }

    inline AccountType toAccountType(int value) {
        switch (value) {
            case 0: return AccountType::Asset;
            case 1: return AccountType::Liability;
            case 2: return AccountType::Equity;
            case 3: return AccountType::Revenue;
            case 4: return AccountType::Expense;
            default: return AccountType::Unknown;
        }
    }

    inline int toInt(AccountStatus status) {
        return static_cast<int>(status);
    }

    inline int toInt(AccountType type) {
        return static_cast<int>(type);
    }

    inline const char* toString(AccountStatus status) {
        switch (status) {
            case AccountStatus::Inactive:  return "Inactive";
            case AccountStatus::Active:    return "Active";
            case AccountStatus::Suspended: return "Suspended";
            case AccountStatus::Closed:    return "Closed";
            default:                       return "Unknown";
        }
    }

    inline const char* toString(AccountType type) {
        switch (type) {
            case AccountType::Asset:     return "Asset";
            case AccountType::Liability: return "Liability";
            case AccountType::Equity:    return "Equity";
            case AccountType::Revenue:   return "Revenue";
            case AccountType::Expense:   return "Expense";
            default:                     return "Unknown";
        }
    }

}
#endif //BUSINESSDESKAPI_BUSINESSDESKCONSTS_H
