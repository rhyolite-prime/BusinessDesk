#include "services/ledger/ledger_service.h"

#include "models/CoreAccountingUnits.h"
#include "models/CoreCurrencies.h"
#include "models/GlAccountControls.h"
#include "models/GlAccountGroups.h"
#include "models/GlAccounts.h"

#include <drogon/orm/CoroMapper.h>
#include <trantor/utils/Date.h>

#include <algorithm>
#include <charconv>
#include <cctype>
#include <coroutine>
#include <memory>
#include <optional>
#include <set>
#include <string_view>
#include <utility>
#include <vector>

namespace businessdesk::ledger
{
namespace
{
using drogon::orm::CompareOperator;
using drogon::orm::CoroMapper;
using drogon::orm::Criteria;
using drogon::orm::DbClientPtr;
using drogon::orm::SortOrder;
using drogon_model::BusinessDesk::CoreAccountingUnits;
using drogon_model::BusinessDesk::CoreCurrencies;
using drogon_model::BusinessDesk::GlAccountControls;
using drogon_model::BusinessDesk::GlAccountGroups;
using drogon_model::BusinessDesk::GlAccounts;

constexpr std::size_t kMaximumHierarchyDepth = 64;

std::string trim(std::string value)
{
    const auto notSpace = [](unsigned char character) {
        return std::isspace(character) == 0;
    };
    const auto first = std::find_if(value.begin(), value.end(), notSpace);
    const auto last = std::find_if(value.rbegin(), value.rend(), notSpace).base();
    if (first >= last)
    {
        return {};
    }
    value.erase(last, value.end());
    value.erase(value.begin(), first);
    return value;
}

std::string lowerAscii(std::string value)
{
    std::transform(value.begin(), value.end(), value.begin(), [](unsigned char character) {
        return static_cast<char>(std::tolower(character));
    });
    return value;
}

bool isUuid(std::string_view value)
{
    if (value.size() != 36)
    {
        return false;
    }
    for (std::size_t index = 0; index < value.size(); ++index)
    {
        if (index == 8 || index == 13 || index == 18 || index == 23)
        {
            if (value[index] != '-')
            {
                return false;
            }
        }
        else if (std::isxdigit(static_cast<unsigned char>(value[index])) == 0)
        {
            return false;
        }
    }
    return true;
}

std::optional<std::int32_t> accountNumberValue(std::string_view value)
{
    if (value.empty())
    {
        return std::nullopt;
    }
    std::int32_t parsed{};
    const auto result = std::from_chars(value.data(), value.data() + value.size(), parsed);
    if (result.ec != std::errc{} || result.ptr != value.data() + value.size())
    {
        return std::nullopt;
    }
    return parsed;
}

std::string standardAccountTypeName(short accountType)
{
    switch (accountType)
    {
        case 0:
            return "Asset";
        case 1:
            return "Liability";
        case 2:
            return "Equity";
        case 3:
            return "Revenue";
        case 4:
            return "Expense";
        default:
            return "Unknown";
    }
}

void throwIfInvalid(const std::vector<std::string> &errors)
{
    if (!errors.empty())
    {
        throw LedgerServiceError(LedgerErrorCode::Validation,
                                 "The account setup input is invalid.",
                                 errors);
    }
}

void validateScopeShape(const dto::LedgerScope &scope)
{
    if (scope.tenantId <= 0)
    {
        throw LedgerServiceError(LedgerErrorCode::Validation,
                                 "X-Tenant-Id must be a positive integer.");
    }
    if (!isUuid(scope.accountingUnitId))
    {
        throw LedgerServiceError(LedgerErrorCode::Validation,
                                 "X-Accounting-Unit-Id must be a UUID.");
    }
}

void ensureDatabase(const DbClientPtr &db)
{
    if (!db)
    {
        throw LedgerServiceError(LedgerErrorCode::Unavailable,
                                 "The database client is not configured.");
    }
}

template <typename Model>
Criteria tenantUnitCriteria(const dto::LedgerScope &scope, bool includeDeleted = false)
{
    auto criteria = Criteria(Model::Cols::_tenant_id, scope.tenantId) &&
                    Criteria(Model::Cols::_accounting_unit_id, scope.accountingUnitId);
    if (!includeDeleted)
    {
        criteria = criteria && Criteria(Model::Cols::_is_deleted, false);
    }
    return criteria;
}

template <typename Model>
drogon::Task<std::vector<Model>> findMany(DbClientPtr db, Criteria criteria)
{
    CoroMapper<Model> mapper(std::move(db));
    co_return co_await mapper.findBy(criteria);
}

template <typename Model>
drogon::Task<std::optional<Model>> findOptional(DbClientPtr db, Criteria criteria)
{
    auto rows = co_await findMany<Model>(std::move(db), std::move(criteria));
    if (rows.empty())
    {
        co_return std::nullopt;
    }
    if (rows.size() != 1)
    {
        throw LedgerServiceError(LedgerErrorCode::Conflict,
                                 "A scoped account setup lookup returned multiple records.");
    }
    co_return std::move(rows.front());
}

template <typename Model>
drogon::Task<Model> requireScopedModel(DbClientPtr db,
                                       const dto::LedgerScope &scope,
                                       const std::string &id,
                                       std::string resourceName)
{
    auto criteria = tenantUnitCriteria<Model>(scope) && Criteria(Model::Cols::_id, id);
    auto row = co_await findOptional<Model>(std::move(db), std::move(criteria));
    if (!row)
    {
        throw LedgerServiceError(LedgerErrorCode::NotFound,
                                 std::move(resourceName) + " was not found in this accounting unit.");
    }
    co_return std::move(*row);
}

template <typename Model>
drogon::Task<std::size_t> countRows(DbClientPtr db, Criteria criteria)
{
    CoroMapper<Model> mapper(std::move(db));
    co_return co_await mapper.count(criteria);
}

drogon::Task<> ensureScopeExists(DbClientPtr db, dto::LedgerScope scope)
{
    ensureDatabase(db);
    validateScopeShape(scope);

    auto criteria = Criteria(CoreAccountingUnits::Cols::_tenant_id, scope.tenantId) &&
                    Criteria(CoreAccountingUnits::Cols::_id, scope.accountingUnitId) &&
                    Criteria(CoreAccountingUnits::Cols::_is_deleted, false);
    auto units = co_await findMany<CoreAccountingUnits>(std::move(db), std::move(criteria));
    if (units.empty())
    {
        throw LedgerServiceError(LedgerErrorCode::NotFound,
                                 "The accounting unit was not found for this tenant.");
    }
    if (!units.front().getValueOfIsActive())
    {
        throw LedgerServiceError(LedgerErrorCode::Conflict,
                                 "The accounting unit is inactive and cannot be used for setup changes.");
    }
    co_return;
}

class TransactionRollbackGuard
{
  public:
    explicit TransactionRollbackGuard(
        const std::shared_ptr<drogon::orm::Transaction> &transaction) noexcept
        : transaction_(transaction)
    {
    }

    ~TransactionRollbackGuard()
    {
        if (transaction_)
        {
            transaction_->rollback();
        }
    }

    TransactionRollbackGuard(const TransactionRollbackGuard &) = delete;
    TransactionRollbackGuard &operator=(const TransactionRollbackGuard &) = delete;

  private:
    const std::shared_ptr<drogon::orm::Transaction> &transaction_;
};

class CommitAwaiter
{
  public:
    explicit CommitAwaiter(std::shared_ptr<drogon::orm::Transaction> &transaction)
        : transaction_(transaction)
    {
    }

    bool await_ready() const noexcept { return false; }

    void await_suspend(std::coroutine_handle<> handle)
    {
        transaction_->setCommitCallback([this, handle](bool succeeded) {
            succeeded_ = succeeded;
            handle.resume();
        });
        transaction_.reset();
    }

    void await_resume() const
    {
        if (!succeeded_)
        {
            throw drogon::orm::TransactionRollback("Ledger account setup transaction did not commit.");
        }
    }

  private:
    std::shared_ptr<drogon::orm::Transaction> &transaction_;
    bool succeeded_{false};
};

drogon::Task<> commitTransaction(std::shared_ptr<drogon::orm::Transaction> transaction)
{
    if (!transaction)
    {
        throw drogon::orm::TransactionRollback("Ledger account setup transaction is missing.");
    }
    co_await CommitAwaiter(transaction);
    co_return;
}

drogon::Task<std::shared_ptr<drogon::orm::Transaction>> beginScopedWrite(
    DbClientPtr db,
    dto::LedgerScope scope)
{
    ensureDatabase(db);
    validateScopeShape(scope);
    auto transaction = co_await db->newTransactionCoro();
    TransactionRollbackGuard rollbackOnFailure(transaction);
    DbClientPtr transactionDb = transaction;
    auto criteria = Criteria(CoreAccountingUnits::Cols::_tenant_id, scope.tenantId) &&
                    Criteria(CoreAccountingUnits::Cols::_id, scope.accountingUnitId) &&
                    Criteria(CoreAccountingUnits::Cols::_is_deleted, false);
    CoroMapper<CoreAccountingUnits> mapper(std::move(transactionDb));
    auto units = co_await mapper.forUpdate().findBy(criteria);
    if (units.empty())
    {
        throw LedgerServiceError(LedgerErrorCode::NotFound,
                                 "The accounting unit was not found for this tenant.");
    }
    if (!units.front().getValueOfIsActive())
    {
        throw LedgerServiceError(LedgerErrorCode::Conflict,
                                 "The accounting unit is inactive and cannot be used for setup changes.");
    }
    co_return std::move(transaction);
}

drogon::Task<GlAccountGroups> requireActiveGroup(DbClientPtr db,
                                                 const dto::LedgerScope &scope,
                                                 const std::string &id)
{
    auto group = co_await requireScopedModel<GlAccountGroups>(
        std::move(db), scope, id, "Account head");
    if (!group.getValueOfIsActive())
    {
        throw LedgerServiceError(LedgerErrorCode::Conflict,
                                 "The selected account head is inactive.");
    }
    co_return group;
}

drogon::Task<GlAccountControls> requireControl(DbClientPtr db,
                                               const dto::LedgerScope &scope,
                                               std::string id,
                                               std::optional<std::string> groupId = std::nullopt)
{
    auto criteria = tenantUnitCriteria<GlAccountControls>(scope) &&
                    Criteria(GlAccountControls::Cols::_id, id);
    if (groupId)
    {
        criteria = criteria && Criteria(GlAccountControls::Cols::_account_group_id, *groupId);
    }
    auto control = co_await findOptional<GlAccountControls>(std::move(db), std::move(criteria));
    if (!control)
    {
        throw LedgerServiceError(LedgerErrorCode::NotFound,
                                 "Control header was not found in this accounting unit.");
    }
    co_return std::move(*control);
}

drogon::Task<void> validateHeadParent(DbClientPtr db,
                                      const dto::LedgerScope &scope,
                                      const std::optional<std::string> &parentId,
                                      std::int16_t standardAccountType,
                                      const std::string &currentId)
{
    if (!parentId)
    {
        co_return;
    }

    std::set<std::string> visited;
    std::string cursor = *parentId;
    for (std::size_t depth = 0; !cursor.empty(); ++depth)
    {
        if (depth >= kMaximumHierarchyDepth)
        {
            throw LedgerServiceError(LedgerErrorCode::Validation,
                                     "Account head hierarchy exceeds the maximum supported depth.");
        }
        if (!currentId.empty() && cursor == currentId)
        {
            throw LedgerServiceError(LedgerErrorCode::Conflict,
                                     "An account head cannot be its own ancestor.");
        }
        if (!visited.insert(cursor).second)
        {
            throw LedgerServiceError(LedgerErrorCode::Conflict,
                                     "The existing account head hierarchy contains a cycle.");
        }

        auto parent = co_await requireActiveGroup(db, scope, cursor);
        if (parent.getValueOfStandardAccountType() != standardAccountType)
        {
            throw LedgerServiceError(LedgerErrorCode::Validation,
                                     "A child account head must use the same standard account type as its parent.");
        }
        cursor = parent.getParentGroupId() ? parent.getValueOfParentGroupId() : std::string{};
    }
    co_return;
}

drogon::Task<void> validateControlParent(DbClientPtr db,
                                         const dto::LedgerScope &scope,
                                         const dto::AccountControlInput &input,
                                         const std::string &currentId)
{
    if (!input.parentAccountHeaderId)
    {
        co_return;
    }

    std::set<std::string> visited;
    std::string cursor = *input.parentAccountHeaderId;
    for (std::size_t depth = 0; !cursor.empty(); ++depth)
    {
        if (depth >= kMaximumHierarchyDepth)
        {
            throw LedgerServiceError(LedgerErrorCode::Validation,
                                     "Control header hierarchy exceeds the maximum supported depth.");
        }
        if (!currentId.empty() && cursor == currentId)
        {
            throw LedgerServiceError(LedgerErrorCode::Conflict,
                                     "A control header cannot be its own ancestor.");
        }
        if (!visited.insert(cursor).second)
        {
            throw LedgerServiceError(LedgerErrorCode::Conflict,
                                     "The existing control header hierarchy contains a cycle.");
        }

        auto parent = co_await requireControl(db, scope, cursor, input.accountGroupId);
        if (!parent.getValueOfIsActive())
        {
            throw LedgerServiceError(LedgerErrorCode::Conflict,
                                     "A control header must have an active parent in the same account head.");
        }
        if (input.minAccount < parent.getValueOfMinAccount() ||
            input.maxAccount > parent.getValueOfMaxAccount())
        {
            throw LedgerServiceError(LedgerErrorCode::Validation,
                                     "The child control range must fit inside every parent control range.");
        }
        cursor = parent.getParentAccountHeaderId()
                     ? parent.getValueOfParentAccountHeaderId()
                     : std::string{};
    }
    co_return;
}

drogon::Task<std::vector<GlAccountGroups>> findHeadSiblings(
    DbClientPtr db,
    const dto::LedgerScope &scope,
    const std::optional<std::string> &parentId)
{
    auto criteria = tenantUnitCriteria<GlAccountGroups>(scope, true);
    criteria = criteria && (parentId
                                ? Criteria(GlAccountGroups::Cols::_parent_group_id, *parentId)
                                : Criteria(GlAccountGroups::Cols::_parent_group_id,
                                           CompareOperator::IsNull));
    co_return co_await findMany<GlAccountGroups>(std::move(db), std::move(criteria));
}

drogon::Task<void> ensureUniqueHeadName(DbClientPtr db,
                                        const dto::LedgerScope &scope,
                                        const dto::AccountHeadInput &input,
                                        const std::string &excludedId)
{
    auto siblings = co_await findHeadSiblings(std::move(db), scope, input.parentGroupId);
    const auto desiredName = lowerAscii(trim(input.name));
    for (const auto &sibling : siblings)
    {
        if (sibling.getValueOfId() != excludedId &&
            lowerAscii(sibling.getValueOfName()) == desiredName)
        {
            throw LedgerServiceError(LedgerErrorCode::Conflict,
                                     "An account head with this name already exists under the selected parent.");
        }
    }
    co_return;
}

drogon::Task<void> ensureUniqueAccountNumber(DbClientPtr db,
                                             const dto::LedgerScope &scope,
                                             const std::string &accountNumber,
                                             const std::string &excludedId)
{
    auto criteria = tenantUnitCriteria<GlAccounts>(scope, true) &&
                    Criteria(GlAccounts::Cols::_account_number, accountNumber);
    auto matches = co_await findMany<GlAccounts>(std::move(db), std::move(criteria));
    for (const auto &account : matches)
    {
        if (account.getValueOfId() != excludedId)
        {
            throw LedgerServiceError(LedgerErrorCode::Conflict,
                                     "That account number is already reserved in this accounting unit.");
        }
    }
    co_return;
}

drogon::Task<void> ensureCurrencyIsAvailable(DbClientPtr db,
                                             const std::optional<std::string> &currencyId)
{
    if (!currencyId)
    {
        co_return;
    }
    auto criteria = Criteria(CoreCurrencies::Cols::_id, *currencyId) &&
                    Criteria(CoreCurrencies::Cols::_is_active, true) &&
                    Criteria(CoreCurrencies::Cols::_is_deleted, false);
    auto currency = co_await findOptional<CoreCurrencies>(std::move(db), std::move(criteria));
    if (!currency)
    {
        throw LedgerServiceError(LedgerErrorCode::Validation,
                                 "The selected currency is not active or does not exist.");
    }
    co_return;
}

drogon::Task<std::vector<GlAccountControls>> findControlSiblings(
    DbClientPtr db,
    const dto::LedgerScope &scope,
    const std::string &accountGroupId,
    const std::optional<std::string> &parentId)
{
    auto criteria = tenantUnitCriteria<GlAccountControls>(scope) &&
                    Criteria(GlAccountControls::Cols::_account_group_id, accountGroupId) &&
                    Criteria(GlAccountControls::Cols::_is_active, true);
    criteria = criteria && (parentId
                                ? Criteria(GlAccountControls::Cols::_parent_account_header_id, *parentId)
                                : Criteria(GlAccountControls::Cols::_parent_account_header_id,
                                           CompareOperator::IsNull));
    co_return co_await findMany<GlAccountControls>(std::move(db), std::move(criteria));
}

drogon::Task<void> ensureControlSiblingsDoNotOverlap(DbClientPtr db,
                                                     const dto::LedgerScope &scope,
                                                     const dto::AccountControlInput &input,
                                                     const std::string &excludedId)
{
    auto siblings = co_await findControlSiblings(std::move(db),
                                                 scope,
                                                 input.accountGroupId,
                                                 input.parentAccountHeaderId);
    const auto desiredName = lowerAscii(trim(input.accountHeaderName));
    for (const auto &sibling : siblings)
    {
        if (sibling.getValueOfId() == excludedId)
        {
            continue;
        }
        if (lowerAscii(sibling.getValueOfAccountHeaderName()) == desiredName)
        {
            throw LedgerServiceError(LedgerErrorCode::Conflict,
                                     "A control header with this name already exists under the selected parent.");
        }
        const bool overlaps = input.minAccount <= sibling.getValueOfMaxAccount() &&
                              input.maxAccount >= sibling.getValueOfMinAccount();
        if (overlaps)
        {
            throw LedgerServiceError(LedgerErrorCode::Conflict,
                                     "The control number range overlaps another active sibling header.");
        }
    }
    co_return;
}

struct ControlDependencies
{
    std::vector<GlAccountControls> children;
    std::vector<GlAccounts> accounts;
};

drogon::Task<ControlDependencies> loadControlDependencies(DbClientPtr db,
                                                           const dto::LedgerScope &scope,
                                                           const std::string &controlId)
{
    auto childCriteria = tenantUnitCriteria<GlAccountControls>(scope) &&
                         Criteria(GlAccountControls::Cols::_parent_account_header_id, controlId);
    auto accountCriteria = tenantUnitCriteria<GlAccounts>(scope) &&
                           Criteria(GlAccounts::Cols::_account_header_id, controlId);
    ControlDependencies dependencies;
    dependencies.children = co_await findMany<GlAccountControls>(db, std::move(childCriteria));
    dependencies.accounts = co_await findMany<GlAccounts>(std::move(db), std::move(accountCriteria));
    co_return dependencies;
}

drogon::Task<void> validateControlDependents(DbClientPtr db,
                                             const dto::LedgerScope &scope,
                                             const GlAccountControls &current,
                                             const dto::AccountControlInput &input)
{
    auto dependencies = co_await loadControlDependencies(db, scope, current.getValueOfId());
    const bool groupChanged = current.getValueOfAccountGroupId() != input.accountGroupId;
    if (groupChanged && (!dependencies.children.empty() || !dependencies.accounts.empty()))
    {
        throw LedgerServiceError(LedgerErrorCode::Conflict,
                                 "Reassign child control headers and detail accounts before moving this header to another account head.");
    }

    for (const auto &child : dependencies.children)
    {
        if (child.getValueOfMinAccount() < input.minAccount ||
            child.getValueOfMaxAccount() > input.maxAccount)
        {
            throw LedgerServiceError(LedgerErrorCode::Conflict,
                                     "The updated range must continue to contain every child control range.");
        }
        if (!input.isActive && child.getValueOfIsActive())
        {
            throw LedgerServiceError(LedgerErrorCode::Conflict,
                                     "Deactivate or reassign active child controls before deactivating this header.");
        }
    }

    for (const auto &account : dependencies.accounts)
    {
        const auto number = accountNumberValue(account.getValueOfAccountNumber());
        if (!number || *number < input.minAccount || *number > input.maxAccount)
        {
            throw LedgerServiceError(LedgerErrorCode::Conflict,
                                     "The updated range must continue to contain every assigned detail account number.");
        }
        if (!input.isActive && account.getValueOfStatus() == "active")
        {
            throw LedgerServiceError(LedgerErrorCode::Conflict,
                                     "Deactivate or reassign active detail accounts before deactivating this header.");
        }
    }
    co_return;
}

drogon::Task<std::pair<GlAccountControls, GlAccountGroups>> requirePostingControl(
    DbClientPtr db,
    const dto::LedgerScope &scope,
    const dto::AccountDetailInput &input)
{
    auto control = co_await requireControl(db, scope, input.accountHeaderId);
    if (!control.getValueOfIsActive())
    {
        throw LedgerServiceError(LedgerErrorCode::Conflict,
                                 "Detail accounts must be assigned to an active control header.");
    }

    auto group = co_await requireActiveGroup(db, scope, control.getValueOfAccountGroupId());
    if (input.accountGroupId && *input.accountGroupId != control.getValueOfAccountGroupId())
    {
        throw LedgerServiceError(LedgerErrorCode::Validation,
                                 "The supplied accountGroupId does not match the selected control header.");
    }

    auto childCriteria = tenantUnitCriteria<GlAccountControls>(scope) &&
                         Criteria(GlAccountControls::Cols::_parent_account_header_id,
                                  control.getValueOfId());
    const auto childCount = co_await countRows<GlAccountControls>(std::move(db),
                                                                  std::move(childCriteria));
    if (childCount > 0)
    {
        throw LedgerServiceError(LedgerErrorCode::Conflict,
                                 "Detail accounts must be assigned to a leaf control header.");
    }

    const auto number = accountNumberValue(trim(input.accountNumber));
    if (!number || *number < control.getValueOfMinAccount() ||
        *number > control.getValueOfMaxAccount())
    {
        throw LedgerServiceError(LedgerErrorCode::Validation,
                                 "Account number must be within the selected control header range.");
    }
    co_return std::make_pair(std::move(control), std::move(group));
}

drogon::Task<void> validateAccountHeadDependents(DbClientPtr db,
                                                 const dto::LedgerScope &scope,
                                                 const GlAccountGroups &current,
                                                 const dto::AccountHeadInput &input)
{
    auto childGroupCriteria = tenantUnitCriteria<GlAccountGroups>(scope) &&
                              Criteria(GlAccountGroups::Cols::_parent_group_id,
                                       current.getValueOfId());
    auto controlCriteria = tenantUnitCriteria<GlAccountControls>(scope) &&
                           Criteria(GlAccountControls::Cols::_account_group_id,
                                    current.getValueOfId());
    auto accountCriteria = tenantUnitCriteria<GlAccounts>(scope) &&
                           Criteria(GlAccounts::Cols::_account_group_id,
                                    current.getValueOfId());
    auto children = co_await findMany<GlAccountGroups>(db, std::move(childGroupCriteria));
    auto controls = co_await findMany<GlAccountControls>(db, std::move(controlCriteria));
    auto accounts = co_await findMany<GlAccounts>(std::move(db), std::move(accountCriteria));

    const bool typeChanged = current.getValueOfStandardAccountType() != input.standardAccountType;
    if (typeChanged && (!children.empty() || !controls.empty() || !accounts.empty()))
    {
        throw LedgerServiceError(LedgerErrorCode::Conflict,
                                 "Reclassify or move dependent account heads, control headers, and detail accounts before changing this standard account type.");
    }

    if (current.getValueOfIsActive() && !input.isActive)
    {
        const bool activeChild = std::any_of(children.begin(), children.end(), [](const auto &child) {
            return child.getValueOfIsActive();
        });
        const bool activeControl = std::any_of(controls.begin(), controls.end(), [](const auto &control) {
            return control.getValueOfIsActive();
        });
        const bool activeAccount = std::any_of(accounts.begin(), accounts.end(), [](const auto &account) {
            return account.getValueOfStatus() == "active";
        });
        if (activeChild || activeControl || activeAccount)
        {
            throw LedgerServiceError(LedgerErrorCode::Conflict,
                                     "Deactivate or reassign active child setup records before deactivating this account head.");
        }
    }
    co_return;
}

dto::AccountHeadDto toDto(const GlAccountGroups &model)
{
    dto::AccountHeadDto result;
    result.id = model.getValueOfId();
    result.name = model.getValueOfName();
    if (model.getParentGroupId())
    {
        result.parentId = model.getValueOfParentGroupId();
    }
    result.standardAccountType = standardAccountTypeName(model.getValueOfStandardAccountType());
    result.sortOrder = model.getValueOfSortOrder();
    result.isActive = model.getValueOfIsActive();
    return result;
}

dto::AccountControlDto toDto(const GlAccountControls &model)
{
    dto::AccountControlDto result;
    result.id = model.getValueOfId();
    result.accountGroupId = model.getValueOfAccountGroupId();
    if (model.getParentAccountHeaderId())
    {
        result.parentAccountHeaderId = model.getValueOfParentAccountHeaderId();
    }
    result.accountHeaderName = model.getValueOfAccountHeaderName();
    result.minAccount = model.getValueOfMinAccount();
    result.maxAccount = model.getValueOfMaxAccount();
    result.isActive = model.getValueOfIsActive();
    return result;
}

dto::AccountDetailDto toDto(const GlAccounts &model)
{
    dto::AccountDetailDto result;
    result.id = model.getValueOfId();
    if (model.getAccountHeaderId())
    {
        result.accountHeaderId = model.getValueOfAccountHeaderId();
    }
    result.accountGroupId = model.getValueOfAccountGroupId();
    result.accountNumber = model.getValueOfAccountNumber();
    result.accountName = model.getValueOfAccountName();
    result.status = model.getValueOfStatus();
    if (model.getCurrencyId())
    {
        result.currencyId = model.getValueOfCurrencyId();
    }
    result.standardAccountType = standardAccountTypeName(model.getValueOfStandardAccountType());
    result.allowManualPosting = model.getValueOfAllowManualPosting();
    result.isControlAccount = model.getValueOfIsControlAccount();
    return result;
}

}  // namespace

// -- Account heads -----------------------------------------------------------

drogon::Task<std::vector<dto::AccountHeadDto>> LedgerService::listAccountHeads(
    DbClientPtr db,
    dto::LedgerScope scope) const
{
    co_await ensureScopeExists(db, scope);
    auto criteria = tenantUnitCriteria<GlAccountGroups>(scope);
    CoroMapper<GlAccountGroups> mapper(db);
    auto rows = co_await mapper.orderBy(GlAccountGroups::Cols::_sort_order, SortOrder::ASC)
                     .findBy(criteria);
    std::vector<dto::AccountHeadDto> result;
    result.reserve(rows.size());
    for (const auto &row : rows)
    {
        result.push_back(toDto(row));
    }
    co_return result;
}

drogon::Task<dto::AccountHeadDto> LedgerService::getAccountHead(
    DbClientPtr db,
    dto::LedgerScope scope,
    std::string id) const
{
    if (!isUuid(id))
    {
        throw LedgerServiceError(LedgerErrorCode::Validation, "Account head ID must be a UUID.");
    }
    co_await ensureScopeExists(db, scope);
    co_return toDto(co_await requireScopedModel<GlAccountGroups>(
        std::move(db), scope, id, "Account head"));
}

drogon::Task<dto::AccountHeadDto> LedgerService::createAccountHead(
    DbClientPtr db,
    dto::LedgerScope scope,
    dto::AccountHeadInput input) const
{
    throwIfInvalid(validateAccountHeadInput(input));
    input.name = trim(std::move(input.name));
    if (input.parentGroupId)
    {
        *input.parentGroupId = trim(std::move(*input.parentGroupId));
    }
    auto transaction = co_await beginScopedWrite(std::move(db), scope);
    TransactionRollbackGuard rollbackOnFailure(transaction);
    DbClientPtr transactionDb = transaction;
    co_await validateHeadParent(transactionDb, scope, input.parentGroupId,
                                input.standardAccountType, std::string{});
    co_await ensureUniqueHeadName(transactionDb, scope, input, std::string{});

    GlAccountGroups model;
    model.setTenantId(scope.tenantId);
    model.setAccountingUnitId(scope.accountingUnitId);
    if (input.parentGroupId)
    {
        model.setParentGroupId(std::move(*input.parentGroupId));
    }
    model.setName(std::move(input.name));
    model.setStandardAccountType(static_cast<short>(input.standardAccountType));
    model.setSortOrder(input.sortOrder);
    model.setIsActive(input.isActive);

    dto::AccountHeadDto created;
    {
        CoroMapper<GlAccountGroups> mapper(transactionDb);
        created = toDto(co_await mapper.insert(model));
    }
    transactionDb.reset();
    co_await commitTransaction(std::move(transaction));
    co_return created;
}

drogon::Task<dto::AccountHeadDto> LedgerService::updateAccountHead(
    DbClientPtr db,
    dto::LedgerScope scope,
    std::string id,
    dto::AccountHeadInput input) const
{
    if (!isUuid(id))
    {
        throw LedgerServiceError(LedgerErrorCode::Validation, "Account head ID must be a UUID.");
    }
    throwIfInvalid(validateAccountHeadInput(input));
    input.name = trim(std::move(input.name));
    if (input.parentGroupId)
    {
        *input.parentGroupId = trim(std::move(*input.parentGroupId));
    }
    auto transaction = co_await beginScopedWrite(std::move(db), scope);
    TransactionRollbackGuard rollbackOnFailure(transaction);
    DbClientPtr transactionDb = transaction;

    auto current = co_await requireScopedModel<GlAccountGroups>(transactionDb, scope, id, "Account head");
    co_await validateHeadParent(transactionDb, scope, input.parentGroupId,
                                input.standardAccountType, id);
    co_await ensureUniqueHeadName(transactionDb, scope, input, id);
    co_await validateAccountHeadDependents(transactionDb, scope, current, input);

    current.setName(std::move(input.name));
    if (input.parentGroupId)
    {
        current.setParentGroupId(std::move(*input.parentGroupId));
    }
    else
    {
        current.setParentGroupIdToNull();
    }
    current.setStandardAccountType(static_cast<short>(input.standardAccountType));
    current.setSortOrder(input.sortOrder);
    current.setIsActive(input.isActive);
    current.setLastModifiedAt(trantor::Date::now());

    std::size_t affected{};
    {
        CoroMapper<GlAccountGroups> mapper(transactionDb);
        affected = co_await mapper.update(current);
    }
    if (affected == 0)
    {
        throw LedgerServiceError(LedgerErrorCode::NotFound, "Account head was not found.");
    }
    auto updated = toDto(current);
    transactionDb.reset();
    co_await commitTransaction(std::move(transaction));
    co_return updated;
}

drogon::Task<std::string> LedgerService::deleteAccountHead(
    DbClientPtr db,
    dto::LedgerScope scope,
    std::string id) const
{
    if (!isUuid(id))
    {
        throw LedgerServiceError(LedgerErrorCode::Validation, "Account head ID must be a UUID.");
    }
    auto transaction = co_await beginScopedWrite(std::move(db), scope);
    TransactionRollbackGuard rollbackOnFailure(transaction);
    DbClientPtr transactionDb = transaction;
    auto current = co_await requireScopedModel<GlAccountGroups>(transactionDb, scope, id, "Account head");

    auto childGroupCriteria = tenantUnitCriteria<GlAccountGroups>(scope) &&
                              Criteria(GlAccountGroups::Cols::_parent_group_id, id);
    auto controlCriteria = tenantUnitCriteria<GlAccountControls>(scope) &&
                           Criteria(GlAccountControls::Cols::_account_group_id, id);
    auto accountCriteria = tenantUnitCriteria<GlAccounts>(scope) &&
                           Criteria(GlAccounts::Cols::_account_group_id, id);
    const auto childCount = co_await countRows<GlAccountGroups>(transactionDb, std::move(childGroupCriteria));
    const auto controlCount = co_await countRows<GlAccountControls>(transactionDb, std::move(controlCriteria));
    const auto accountCount = co_await countRows<GlAccounts>(transactionDb, std::move(accountCriteria));
    if (childCount + controlCount + accountCount > 0)
    {
        throw LedgerServiceError(LedgerErrorCode::Conflict,
                                 "Reassign or remove child account heads, control headers, and detail accounts before deleting this account head.");
    }

    current.setIsDeleted(true);
    current.setDeletedAt(trantor::Date::now());
    current.setLastModifiedAt(trantor::Date::now());
    std::size_t affected{};
    {
        CoroMapper<GlAccountGroups> mapper(transactionDb);
        affected = co_await mapper.update(current);
    }
    if (affected == 0)
    {
        throw LedgerServiceError(LedgerErrorCode::NotFound, "Account head was not found.");
    }
    transactionDb.reset();
    co_await commitTransaction(std::move(transaction));
    co_return id;
}

// -- Control headers ---------------------------------------------------------

drogon::Task<std::vector<dto::AccountControlDto>> LedgerService::listAccountControls(
    DbClientPtr db,
    dto::LedgerScope scope,
    dto::AccountControlFilter filter) const
{
    if (filter.accountGroupId && !isUuid(*filter.accountGroupId))
    {
        throw LedgerServiceError(LedgerErrorCode::Validation, "accountGroupId must be a UUID.");
    }
    co_await ensureScopeExists(db, scope);
    auto criteria = tenantUnitCriteria<GlAccountControls>(scope);
    if (filter.accountGroupId)
    {
        criteria = criteria && Criteria(GlAccountControls::Cols::_account_group_id,
                                        *filter.accountGroupId);
    }
    CoroMapper<GlAccountControls> mapper(db);
    auto rows = co_await mapper.orderBy(GlAccountControls::Cols::_account_header_name,
                                        SortOrder::ASC)
                     .findBy(criteria);
    std::vector<dto::AccountControlDto> result;
    result.reserve(rows.size());
    for (const auto &row : rows)
    {
        result.push_back(toDto(row));
    }
    co_return result;
}

drogon::Task<dto::AccountControlDto> LedgerService::getAccountControl(
    DbClientPtr db,
    dto::LedgerScope scope,
    std::string id) const
{
    if (!isUuid(id))
    {
        throw LedgerServiceError(LedgerErrorCode::Validation, "Control header ID must be a UUID.");
    }
    co_await ensureScopeExists(db, scope);
    co_return toDto(co_await requireScopedModel<GlAccountControls>(
        std::move(db), scope, id, "Control header"));
}

drogon::Task<dto::AccountControlDto> LedgerService::createAccountControl(
    DbClientPtr db,
    dto::LedgerScope scope,
    dto::AccountControlInput input) const
{
    throwIfInvalid(validateAccountControlInput(input));
    input.accountGroupId = trim(std::move(input.accountGroupId));
    input.accountHeaderName = trim(std::move(input.accountHeaderName));
    if (input.parentAccountHeaderId)
    {
        *input.parentAccountHeaderId = trim(std::move(*input.parentAccountHeaderId));
    }
    auto transaction = co_await beginScopedWrite(std::move(db), scope);
    TransactionRollbackGuard rollbackOnFailure(transaction);
    DbClientPtr transactionDb = transaction;
    co_await requireActiveGroup(transactionDb, scope, input.accountGroupId);
    co_await validateControlParent(transactionDb, scope, input, std::string{});
    co_await ensureControlSiblingsDoNotOverlap(transactionDb, scope, input, std::string{});

    GlAccountControls model;
    model.setTenantId(scope.tenantId);
    model.setAccountingUnitId(scope.accountingUnitId);
    model.setAccountGroupId(std::move(input.accountGroupId));
    if (input.parentAccountHeaderId)
    {
        model.setParentAccountHeaderId(std::move(*input.parentAccountHeaderId));
    }
    model.setAccountHeaderName(std::move(input.accountHeaderName));
    model.setMinAccount(input.minAccount);
    model.setMaxAccount(input.maxAccount);
    model.setIsActive(input.isActive);

    dto::AccountControlDto created;
    {
        CoroMapper<GlAccountControls> mapper(transactionDb);
        created = toDto(co_await mapper.insert(model));
    }
    transactionDb.reset();
    co_await commitTransaction(std::move(transaction));
    co_return created;
}

drogon::Task<dto::AccountControlDto> LedgerService::updateAccountControl(
    DbClientPtr db,
    dto::LedgerScope scope,
    std::string id,
    dto::AccountControlInput input) const
{
    if (!isUuid(id))
    {
        throw LedgerServiceError(LedgerErrorCode::Validation, "Control header ID must be a UUID.");
    }
    throwIfInvalid(validateAccountControlInput(input));
    input.accountGroupId = trim(std::move(input.accountGroupId));
    input.accountHeaderName = trim(std::move(input.accountHeaderName));
    if (input.parentAccountHeaderId)
    {
        *input.parentAccountHeaderId = trim(std::move(*input.parentAccountHeaderId));
    }
    auto transaction = co_await beginScopedWrite(std::move(db), scope);
    TransactionRollbackGuard rollbackOnFailure(transaction);
    DbClientPtr transactionDb = transaction;

    auto current = co_await requireScopedModel<GlAccountControls>(transactionDb, scope, id, "Control header");
    co_await requireActiveGroup(transactionDb, scope, input.accountGroupId);
    co_await validateControlParent(transactionDb, scope, input, id);
    co_await ensureControlSiblingsDoNotOverlap(transactionDb, scope, input, id);
    co_await validateControlDependents(transactionDb, scope, current, input);

    current.setAccountGroupId(std::move(input.accountGroupId));
    if (input.parentAccountHeaderId)
    {
        current.setParentAccountHeaderId(std::move(*input.parentAccountHeaderId));
    }
    else
    {
        current.setParentAccountHeaderIdToNull();
    }
    current.setAccountHeaderName(std::move(input.accountHeaderName));
    current.setMinAccount(input.minAccount);
    current.setMaxAccount(input.maxAccount);
    current.setIsActive(input.isActive);
    current.setLastModifiedAt(trantor::Date::now());

    std::size_t affected{};
    {
        CoroMapper<GlAccountControls> mapper(transactionDb);
        affected = co_await mapper.update(current);
    }
    if (affected == 0)
    {
        throw LedgerServiceError(LedgerErrorCode::NotFound, "Control header was not found.");
    }
    auto updated = toDto(current);
    transactionDb.reset();
    co_await commitTransaction(std::move(transaction));
    co_return updated;
}

drogon::Task<std::string> LedgerService::deleteAccountControl(
    DbClientPtr db,
    dto::LedgerScope scope,
    std::string id) const
{
    if (!isUuid(id))
    {
        throw LedgerServiceError(LedgerErrorCode::Validation, "Control header ID must be a UUID.");
    }
    auto transaction = co_await beginScopedWrite(std::move(db), scope);
    TransactionRollbackGuard rollbackOnFailure(transaction);
    DbClientPtr transactionDb = transaction;
    auto current = co_await requireScopedModel<GlAccountControls>(transactionDb, scope, id, "Control header");
    auto dependencies = co_await loadControlDependencies(transactionDb, scope, id);
    if (!dependencies.children.empty() || !dependencies.accounts.empty())
    {
        throw LedgerServiceError(LedgerErrorCode::Conflict,
                                 "Reassign child control headers and detail accounts before deleting this control header.");
    }

    current.setIsDeleted(true);
    current.setDeletedAt(trantor::Date::now());
    current.setLastModifiedAt(trantor::Date::now());
    std::size_t affected{};
    {
        CoroMapper<GlAccountControls> mapper(transactionDb);
        affected = co_await mapper.update(current);
    }
    if (affected == 0)
    {
        throw LedgerServiceError(LedgerErrorCode::NotFound, "Control header was not found.");
    }
    transactionDb.reset();
    co_await commitTransaction(std::move(transaction));
    co_return id;
}

// -- Detail / posting accounts ----------------------------------------------

drogon::Task<std::vector<dto::AccountDetailDto>> LedgerService::listAccountDetails(
    DbClientPtr db,
    dto::LedgerScope scope,
    dto::AccountDetailFilter filter) const
{
    if (filter.accountGroupId && !isUuid(*filter.accountGroupId))
    {
        throw LedgerServiceError(LedgerErrorCode::Validation, "accountGroupId must be a UUID.");
    }
    if (filter.accountHeaderId && !isUuid(*filter.accountHeaderId))
    {
        throw LedgerServiceError(LedgerErrorCode::Validation, "accountHeaderId must be a UUID.");
    }
    if (filter.status && *filter.status != "active" && *filter.status != "inactive")
    {
        throw LedgerServiceError(LedgerErrorCode::Validation,
                                 "status filter must be either active or inactive.");
    }
    co_await ensureScopeExists(db, scope);
    auto criteria = tenantUnitCriteria<GlAccounts>(scope);
    if (filter.accountGroupId)
    {
        criteria = criteria && Criteria(GlAccounts::Cols::_account_group_id,
                                        *filter.accountGroupId);
    }
    if (filter.accountHeaderId)
    {
        criteria = criteria && Criteria(GlAccounts::Cols::_account_header_id,
                                        *filter.accountHeaderId);
    }
    if (filter.status)
    {
        criteria = criteria && Criteria(GlAccounts::Cols::_status, *filter.status);
    }
    CoroMapper<GlAccounts> mapper(db);
    auto rows = co_await mapper.orderBy(GlAccounts::Cols::_account_number, SortOrder::ASC)
                     .findBy(criteria);
    std::vector<dto::AccountDetailDto> result;
    result.reserve(rows.size());
    for (const auto &row : rows)
    {
        result.push_back(toDto(row));
    }
    co_return result;
}

drogon::Task<dto::AccountDetailDto> LedgerService::getAccountDetail(
    DbClientPtr db,
    dto::LedgerScope scope,
    std::string id) const
{
    if (!isUuid(id))
    {
        throw LedgerServiceError(LedgerErrorCode::Validation, "Detail account ID must be a UUID.");
    }
    co_await ensureScopeExists(db, scope);
    co_return toDto(co_await requireScopedModel<GlAccounts>(
        std::move(db), scope, id, "Detail account"));
}

drogon::Task<dto::AccountDetailDto> LedgerService::createAccountDetail(
    DbClientPtr db,
    dto::LedgerScope scope,
    dto::AccountDetailInput input) const
{
    throwIfInvalid(validateAccountDetailInput(input));
    input.accountHeaderId = trim(std::move(input.accountHeaderId));
    input.accountNumber = trim(std::move(input.accountNumber));
    input.accountName = trim(std::move(input.accountName));
    input.status = lowerAscii(trim(std::move(input.status)));
    if (input.accountGroupId)
    {
        *input.accountGroupId = trim(std::move(*input.accountGroupId));
    }
    if (input.currencyId)
    {
        *input.currencyId = trim(std::move(*input.currencyId));
    }
    auto transaction = co_await beginScopedWrite(std::move(db), scope);
    TransactionRollbackGuard rollbackOnFailure(transaction);
    DbClientPtr transactionDb = transaction;
    auto [control, group] = co_await requirePostingControl(transactionDb, scope, input);
    co_await ensureCurrencyIsAvailable(transactionDb, input.currencyId);
    co_await ensureUniqueAccountNumber(transactionDb, scope, input.accountNumber, std::string{});

    GlAccounts model;
    model.setTenantId(scope.tenantId);
    model.setAccountingUnitId(scope.accountingUnitId);
    model.setAccountHeaderId(control.getValueOfId());
    model.setAccountGroupId(group.getValueOfId());
    model.setAccountNumber(std::move(input.accountNumber));
    model.setAccountName(std::move(input.accountName));
    model.setStatus(std::move(input.status));
    if (input.currencyId)
    {
        model.setCurrencyId(std::move(*input.currencyId));
    }
    model.setStandardAccountType(group.getValueOfStandardAccountType());
    model.setAllowManualPosting(input.allowManualPosting);
    model.setIsControlAccount(input.isControlAccount);

    dto::AccountDetailDto created;
    {
        CoroMapper<GlAccounts> mapper(transactionDb);
        created = toDto(co_await mapper.insert(model));
    }
    transactionDb.reset();
    co_await commitTransaction(std::move(transaction));
    co_return created;
}

drogon::Task<dto::AccountDetailDto> LedgerService::updateAccountDetail(
    DbClientPtr db,
    dto::LedgerScope scope,
    std::string id,
    dto::AccountDetailInput input) const
{
    if (!isUuid(id))
    {
        throw LedgerServiceError(LedgerErrorCode::Validation, "Detail account ID must be a UUID.");
    }
    throwIfInvalid(validateAccountDetailInput(input));
    input.accountHeaderId = trim(std::move(input.accountHeaderId));
    input.accountNumber = trim(std::move(input.accountNumber));
    input.accountName = trim(std::move(input.accountName));
    input.status = lowerAscii(trim(std::move(input.status)));
    if (input.accountGroupId)
    {
        *input.accountGroupId = trim(std::move(*input.accountGroupId));
    }
    if (input.currencyId)
    {
        *input.currencyId = trim(std::move(*input.currencyId));
    }
    auto transaction = co_await beginScopedWrite(std::move(db), scope);
    TransactionRollbackGuard rollbackOnFailure(transaction);
    DbClientPtr transactionDb = transaction;

    auto current = co_await requireScopedModel<GlAccounts>(transactionDb, scope, id, "Detail account");
    auto [control, group] = co_await requirePostingControl(transactionDb, scope, input);
    co_await ensureCurrencyIsAvailable(transactionDb, input.currencyId);
    co_await ensureUniqueAccountNumber(transactionDb, scope, input.accountNumber, id);

    current.setAccountHeaderId(control.getValueOfId());
    current.setAccountGroupId(group.getValueOfId());
    current.setAccountNumber(std::move(input.accountNumber));
    current.setAccountName(std::move(input.accountName));
    current.setStatus(std::move(input.status));
    if (input.currencyId)
    {
        current.setCurrencyId(std::move(*input.currencyId));
    }
    else
    {
        current.setCurrencyIdToNull();
    }
    current.setStandardAccountType(group.getValueOfStandardAccountType());
    current.setAllowManualPosting(input.allowManualPosting);
    current.setIsControlAccount(input.isControlAccount);
    current.setLastModifiedAt(trantor::Date::now());

    std::size_t affected{};
    {
        CoroMapper<GlAccounts> mapper(transactionDb);
        affected = co_await mapper.update(current);
    }
    if (affected == 0)
    {
        throw LedgerServiceError(LedgerErrorCode::NotFound, "Detail account was not found.");
    }
    auto updated = toDto(current);
    transactionDb.reset();
    co_await commitTransaction(std::move(transaction));
    co_return updated;
}

drogon::Task<std::string> LedgerService::deleteAccountDetail(
    DbClientPtr db,
    dto::LedgerScope scope,
    std::string id) const
{
    if (!isUuid(id))
    {
        throw LedgerServiceError(LedgerErrorCode::Validation, "Detail account ID must be a UUID.");
    }
    auto transaction = co_await beginScopedWrite(std::move(db), scope);
    TransactionRollbackGuard rollbackOnFailure(transaction);
    DbClientPtr transactionDb = transaction;
    auto current = co_await requireScopedModel<GlAccounts>(transactionDb, scope, id, "Detail account");

    current.setIsDeleted(true);
    current.setDeletedAt(trantor::Date::now());
    current.setLastModifiedAt(trantor::Date::now());
    std::size_t affected{};
    {
        CoroMapper<GlAccounts> mapper(transactionDb);
        affected = co_await mapper.update(current);
    }
    if (affected == 0)
    {
        throw LedgerServiceError(LedgerErrorCode::NotFound, "Detail account was not found.");
    }
    transactionDb.reset();
    co_await commitTransaction(std::move(transaction));
    co_return id;
}

}  // namespace businessdesk::ledger
