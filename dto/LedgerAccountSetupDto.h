#pragma once

#include <cstdint>
#include <optional>
#include <string>

namespace businessdesk::dto
{
// Scope is supplied by the API boundary. Once authentication is introduced,
// the controller should build it from verified claims rather than trusting
// caller-controlled values.
struct LedgerScope
{
    std::int32_t tenantId{0};
    std::string accountingUnitId;
};

struct AccountHeadInput
{
    std::string name;
    std::optional<std::string> parentGroupId;
    // 0=Asset, 1=Liability, 2=Equity, 3=Revenue, 4=Expense.
    std::int16_t standardAccountType{0};
    std::int32_t sortOrder{0};
    bool isActive{true};
};

struct AccountControlInput
{
    std::string accountGroupId;
    std::optional<std::string> parentAccountHeaderId;
    std::string accountHeaderName;
    std::int32_t minAccount{0};
    std::int32_t maxAccount{0};
    bool isActive{true};
};

struct AccountDetailInput
{
    std::string accountHeaderId;
    // Optional for clients that already know it. The service always derives
    // the persisted group from the selected control header and rejects a
    // supplied group that does not match it.
    std::optional<std::string> accountGroupId;
    std::string accountNumber;
    std::string accountName;
    std::string status{"active"};
    std::optional<std::string> currencyId;
    bool allowManualPosting{true};
    bool isControlAccount{false};
};

struct AccountControlFilter
{
    std::optional<std::string> accountGroupId;
};

struct AccountDetailFilter
{
    std::optional<std::string> accountGroupId;
    std::optional<std::string> accountHeaderId;
    std::optional<std::string> status;
};

struct AccountHeadDto
{
    std::string id;
    std::string name;
    std::optional<std::string> parentId;
    std::string standardAccountType;
    std::int32_t sortOrder{0};
    bool isActive{false};
};

struct AccountControlDto
{
    std::string id;
    std::string accountGroupId;
    std::optional<std::string> parentAccountHeaderId;
    std::string accountHeaderName;
    std::int32_t minAccount{0};
    std::int32_t maxAccount{0};
    bool isActive{false};
};

struct AccountDetailDto
{
    std::string id;
    std::optional<std::string> accountHeaderId;
    std::string accountGroupId;
    std::string accountNumber;
    std::string accountName;
    std::string status;
    std::optional<std::string> currencyId;
    std::string standardAccountType;
    bool allowManualPosting{false};
    bool isControlAccount{false};
};
}  // namespace businessdesk::dto
