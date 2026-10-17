//
// Created by Emmanuel Addo-Odame on 15/10/2026.
//

#include "dto/BaseApiResponse.h"
#include "GlService.h"

#include "GlAccountControls.h"
#include "GlAccountGroups.h"
#include "GlAccounts.h"
#include "GlBankAccounts.h"

#include "contants/BusinessDeskConsts.h"

#include <trantor/utils/Date.h>

#include <algorithm>
#include <cctype>
#include <cstdio>
#include <string>
#include <utility>

using namespace drogon::orm;
using drogon_model::BusinessDesk::GlAccountControls;
using drogon_model::BusinessDesk::GlAccountGroups;
using drogon_model::BusinessDesk::GlAccounts;
using drogon_model::BusinessDesk::GlBankAccounts;

namespace {

constexpr int kMaxAccountHeadDepth = 64;

std::string toLowerCopy(std::string value) {
    std::transform(value.begin(), value.end(), value.begin(),
                   [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
    return value;
}

business_desk::dto::BaseApiResponse makeErrorResponse(const std::string &code, const std::string &message,
                                       const std::string &detail = std::string()) {
    business_desk::dto::BaseApiResponse response;
    response.success = false;
    response.error["code"] = code;
    response.error["message"] = message;
    if (!detail.empty()) {
        response.error["detail"] = detail;
    }
    return response;
}

business_desk::dto::BaseApiResponse makePaginatedResponse(size_t totalCount, int pageNo, int pageSize, Json::Value data) {
    business_desk::dto::BaseApiResponse response;
    response.success = true;
    const auto safePageSize = pageSize > 0 ? static_cast<size_t>(pageSize) : 1u;
    const auto totalPages = (totalCount + safePageSize - 1) / safePageSize;
    response.result["data"] = std::move(data);
    response.result["totalCount"] = (Json::UInt64)totalCount;
    response.result["pageNo"] = pageNo;
    response.result["pageSize"] = pageSize;
    response.result["totalPages"] = (int)totalPages;
    response.result["lowerBound"] = pageSize * (pageNo - 1) + 1;
    response.result["upperBound"] = (int)totalPages <= pageNo ? (Json::UInt64)totalCount : (Json::UInt64)(pageNo * pageSize);
    return response;
}

business_desk::dto::BaseApiResponse makeDeletedResponse(const std::string &id) {
    business_desk::dto::BaseApiResponse response;
    response.success = true;
    response.result["id"] = id;
    response.result["deleted"] = true;
    return response;
}

// Validates the parent of an account head: the parent must exist, be active,
// carry the same standard account type, and the resulting hierarchy must stay
// acyclic and within the maximum depth. An empty parent id is valid (root head).
// Returns an empty string when the parent reference is acceptable.
drogon::Task<std::string> validateAccountHeadParent(const drogon::orm::DbClientPtr &dbClient,
                                                    const std::string &parentGroupId,
                                                    const std::string &selfId,
                                                    short standardAccountType) {
    if (parentGroupId.empty()) {
        co_return std::string();
    }

    auto mp = drogon::orm::CoroMapper<GlAccountGroups>(dbClient);
    auto parents = co_await mp.findBy(Criteria(GlAccountGroups::Cols::_id, CompareOperator::EQ, parentGroupId) &&
                                      Criteria(GlAccountGroups::Cols::_is_deleted, CompareOperator::EQ, false));
    if (parents.empty()) {
        co_return std::string("Parent account head not found.");
    }
    const auto &parent = parents.front();
    if (!parent.getValueOfIsActive()) {
        co_return std::string("Parent account head must be active.");
    }
    if (parent.getValueOfStandardAccountType() != standardAccountType) {
        co_return std::string("Parent account head must have the same standard account type.");
    }

    // Walk the ancestor chain to reject cycles and excessive depth.
    auto ancestorId = parent.getParentGroupId();
    int depth = 1;
    while (ancestorId) {
        if (*ancestorId == selfId) {
            co_return std::string("Account head parent reference creates a cycle.");
        }
        if (++depth > kMaxAccountHeadDepth) {
            co_return std::string("Account head hierarchy depth exceeds the limit of 64.");
        }
        auto ancestors = co_await mp.findBy(Criteria(GlAccountGroups::Cols::_id, CompareOperator::EQ, *ancestorId) &&
                                            Criteria(GlAccountGroups::Cols::_is_deleted, CompareOperator::EQ, false));
        if (ancestors.empty()) {
            break;
        }
        ancestorId = ancestors.front().getParentGroupId();
    }
    co_return std::string();
}

// Validates the parent of a control header: it must exist, be active, belong to
// the same account head, and fully contain the child range. An empty parent id
// is valid (root control header).
drogon::Task<std::string> validateAccountControlParent(const drogon::orm::DbClientPtr &dbClient,
                                                       const std::string &parentControlId,
                                                       const std::string &accountGroupId,
                                                       int minAccount,
                                                       int maxAccount) {
    if (parentControlId.empty()) {
        co_return std::string();
    }

    auto mp = drogon::orm::CoroMapper<GlAccountControls>(dbClient);
    auto parents = co_await mp.findBy(Criteria(GlAccountControls::Cols::_id, CompareOperator::EQ, parentControlId) &&
                                      Criteria(GlAccountControls::Cols::_is_deleted, CompareOperator::EQ, false));
    if (parents.empty()) {
        co_return std::string("Parent account control not found.");
    }
    const auto &parent = parents.front();
    if (parent.getValueOfAccountGroupId() != accountGroupId) {
        co_return std::string("Parent account control must belong to the same account head.");
    }
    if (!parent.getValueOfIsActive()) {
        co_return std::string("Parent account control must be active.");
    }
    if (minAccount < parent.getValueOfMinAccount() || maxAccount > parent.getValueOfMaxAccount()) {
        co_return std::string("Control account range must fit inside the parent control range.");
    }
    co_return std::string();
}

// Validates that no active sibling control header under the same parent shares
// the header name or overlaps the account number range. When selfId is not
// empty the header itself is excluded from the comparison.
drogon::Task<std::string> validateAccountControlSiblings(const drogon::orm::DbClientPtr &dbClient,
                                                         const std::string &selfId,
                                                         const std::string &accountGroupId,
                                                         const std::string &parentControlId,
                                                         const std::string &name,
                                                         int minAccount,
                                                         int maxAccount) {
    auto mp = drogon::orm::CoroMapper<GlAccountControls>(dbClient);
    Criteria siblingCriteria = Criteria(GlAccountControls::Cols::_account_group_id, CompareOperator::EQ, accountGroupId) &&
                               Criteria(GlAccountControls::Cols::_is_active, CompareOperator::EQ, true) &&
                               Criteria(GlAccountControls::Cols::_is_deleted, CompareOperator::EQ, false);
    if (parentControlId.empty()) {
        siblingCriteria = siblingCriteria && Criteria(GlAccountControls::Cols::_parent_account_header_id, CompareOperator::IsNull);
    } else {
        siblingCriteria = siblingCriteria && Criteria(GlAccountControls::Cols::_parent_account_header_id, CompareOperator::EQ, parentControlId);
    }
    if (!selfId.empty()) {
        siblingCriteria = siblingCriteria && Criteria(GlAccountControls::Cols::_id, CompareOperator::NE, selfId);
    }

    auto siblings = co_await mp.findBy(siblingCriteria);
    for (const auto &sibling : siblings) {
        if (toLowerCopy(sibling.getValueOfAccountHeaderName()) == toLowerCopy(name)) {
            co_return std::string("An active account control with this name already exists under the same parent.");
        }
        if (!(sibling.getValueOfMaxAccount() < minAccount || sibling.getValueOfMinAccount() > maxAccount)) {
            co_return std::string("An active account control with an overlapping account number range already exists.");
        }
    }
    co_return std::string();
}

} // namespace

namespace business_desk::services {

    drogon::Task<dto::BaseApiResponse> GlService::getAllAccountHeads(int pageNo, int pageSize, const std::string &query) {

    auto dbClient = drogon::app().getDbClient();
    auto mp = drogon::orm::CoroMapper<GlAccountGroups>(dbClient);

    // 1. Build the search criteria; soft-deleted rows never surface.
    Criteria searchCriteria(GlAccountGroups::Cols::_is_deleted, CompareOperator::EQ, false);
    if (!query.empty()) {
      std::string likeQuery = "%" + query + "%";
      searchCriteria = searchCriteria && Criteria(GlAccountGroups::Cols::_name, CompareOperator::Like, likeQuery);
    }

    try {
      // 2. Get the total count matching the criteria
      size_t totalCount = co_await mp.count(searchCriteria);

      // 3. Find the paginated data
      Json::Value data = Json::arrayValue;
      if (totalCount > 0) {
        int offset = (pageNo - 1) * pageSize;
        auto accountGroups = co_await mp.limit(pageSize).offset(offset).findBy(searchCriteria);

        // 4. Map the persisted rows onto the camelCase API contract
        for (const auto &accountGroup : accountGroups) {

          Json::Value accountGroupJson = accountGroup.toJson();
          Json::Value camelCaseAccountGroup;

          camelCaseAccountGroup["id"] = accountGroupJson["id"];
          camelCaseAccountGroup["name"] = accountGroupJson["name"];
          camelCaseAccountGroup["isActive"] = accountGroupJson["is_active"];
          camelCaseAccountGroup["accountType"] = accountGroupJson["standard_account_type"];
          camelCaseAccountGroup["parentGroupId"] = accountGroupJson["parent_group_id"];
          camelCaseAccountGroup["createdAt"] = accountGroupJson["created_at"];
          camelCaseAccountGroup["updatedAt"] = accountGroupJson["last_modified_at"];
          data.append(camelCaseAccountGroup);
        }
      }

      co_return makePaginatedResponse(totalCount, pageNo, pageSize, data);

    } catch (const drogon::orm::DrogonDbException &e) {
      co_return makeErrorResponse("database_error", "Database error while fetching account heads.", e.base().what());
    }


    }

    drogon::Task<dto::BaseApiResponse> GlService::createAccountHead(const dto::AccountHeadDto &dto) {

      if (dto.getAccountHeadName().empty()) {
        co_return makeErrorResponse("validation_error", "Account head name is required.");
      }
      if (dto.getAccountType() < static_cast<int32_t>(constants::AccountType::Asset) ||
          dto.getAccountType() > static_cast<int32_t>(constants::AccountType::Expense)) {
        co_return makeErrorResponse("validation_error", "Account type must be a standard account type code between 0 and 4.");
      }

      auto dbClient = drogon::app().getDbClient();
      auto mp = CoroMapper<GlAccountGroups>(dbClient);

      try {
        auto parentError = co_await validateAccountHeadParent(dbClient, dto.getParentHeadId(), std::string(),
                                                              static_cast<short>(dto.getAccountType()));
        if (!parentError.empty()) {
          co_return makeErrorResponse("validation_error", parentError);
        }

        GlAccountGroups newAccountGroup;
        newAccountGroup.setName(dto.getAccountHeadName());
        newAccountGroup.setIsActive(dto.getIsActive());
        if (dto.getParentHeadId().empty()) {
          newAccountGroup.setParentGroupIdToNull();
        } else {
          newAccountGroup.setParentGroupId(dto.getParentHeadId());
        }
        newAccountGroup.setStandardAccountType(static_cast<short>(dto.getAccountType()));

        auto result = co_await mp.insert(newAccountGroup);
        dto::BaseApiResponse response;
        response.success = true;
        response.result = result.toJson();
        co_return response;

      } catch (const DrogonDbException &e) {
        co_return makeErrorResponse("database_error", "Database error while creating account head.", e.base().what());
      }

    }

    drogon::Task<dto::BaseApiResponse> GlService::updateAccountHead(const dto::AccountHeadDto &dto, const std::string &id) {

      if (dto.getAccountHeadName().empty()) {
        co_return makeErrorResponse("validation_error", "Account head name is required.");
      }
      if (dto.getAccountType() < static_cast<int32_t>(constants::AccountType::Asset) ||
          dto.getAccountType() > static_cast<int32_t>(constants::AccountType::Expense)) {
        co_return makeErrorResponse("validation_error", "Account type must be a standard account type code between 0 and 4.");
      }

      auto dbClient = drogon::app().getDbClient();
      auto mp = CoroMapper<GlAccountGroups>(dbClient);
      auto groupMapper = CoroMapper<GlAccountGroups>(dbClient);
      auto controlMapper = CoroMapper<GlAccountControls>(dbClient);
      auto accountMapper = CoroMapper<GlAccounts>(dbClient);

      try {
        auto existing = co_await mp.findBy(Criteria(GlAccountGroups::Cols::_id, CompareOperator::EQ, id) &&
                                           Criteria(GlAccountGroups::Cols::_is_deleted, CompareOperator::EQ, false));
        if (existing.empty()) {
          co_return makeErrorResponse("not_found", "Account head not found.");
        }
        auto accountGroup = existing.front();

        auto parentError = co_await validateAccountHeadParent(dbClient, dto.getParentHeadId(), id,
                                                              static_cast<short>(dto.getAccountType()));
        if (!parentError.empty()) {
          co_return makeErrorResponse("validation_error", parentError);
        }

        // The standard account type is immutable once the head has dependents.
        const bool typeChanged = accountGroup.getValueOfStandardAccountType() != static_cast<short>(dto.getAccountType());
        if (typeChanged) {
          const auto childCount = co_await groupMapper.count(Criteria(GlAccountGroups::Cols::_parent_group_id, CompareOperator::EQ, id) &&
                                                             Criteria(GlAccountGroups::Cols::_is_deleted, CompareOperator::EQ, false));
          const auto controlCount = co_await controlMapper.count(Criteria(GlAccountControls::Cols::_account_group_id, CompareOperator::EQ, id) &&
                                                                 Criteria(GlAccountControls::Cols::_is_deleted, CompareOperator::EQ, false));
          const auto accountCount = co_await accountMapper.count(Criteria(GlAccounts::Cols::_account_group_id, CompareOperator::EQ, id) &&
                                                                 Criteria(GlAccounts::Cols::_is_deleted, CompareOperator::EQ, false));
          if (childCount > 0 || controlCount > 0 || accountCount > 0) {
            co_return makeErrorResponse("conflict", "Standard account type cannot be changed while the account head has dependents.");
          }
        }

        // A head with active dependents cannot be deactivated.
        if (!dto.getIsActive() && accountGroup.getValueOfIsActive()) {
          const auto activeChildCount = co_await groupMapper.count(Criteria(GlAccountGroups::Cols::_parent_group_id, CompareOperator::EQ, id) &&
                                                                   Criteria(GlAccountGroups::Cols::_is_active, CompareOperator::EQ, true) &&
                                                                   Criteria(GlAccountGroups::Cols::_is_deleted, CompareOperator::EQ, false));
          const auto activeControlCount = co_await controlMapper.count(Criteria(GlAccountControls::Cols::_account_group_id, CompareOperator::EQ, id) &&
                                                                       Criteria(GlAccountControls::Cols::_is_active, CompareOperator::EQ, true) &&
                                                                       Criteria(GlAccountControls::Cols::_is_deleted, CompareOperator::EQ, false));
          const auto activeAccountCount = co_await accountMapper.count(Criteria(GlAccounts::Cols::_account_group_id, CompareOperator::EQ, id) &&
                                                                       Criteria(GlAccounts::Cols::_status, CompareOperator::EQ, std::string("active")) &&
                                                                       Criteria(GlAccounts::Cols::_is_deleted, CompareOperator::EQ, false));
          if (activeChildCount > 0 || activeControlCount > 0 || activeAccountCount > 0) {
            co_return makeErrorResponse("conflict", "Account head cannot be deactivated while it has active dependents.");
          }
        }

        accountGroup.setName(dto.getAccountHeadName());
        accountGroup.setIsActive(dto.getIsActive());
        if (dto.getParentHeadId().empty()) {
          accountGroup.setParentGroupIdToNull();
        } else {
          accountGroup.setParentGroupId(dto.getParentHeadId());
        }
        accountGroup.setStandardAccountType(static_cast<short>(dto.getAccountType()));
        accountGroup.setLastModifiedAt(trantor::Date::now());

        co_await mp.update(accountGroup);

        dto::BaseApiResponse response;
        response.success = true;
        response.result = accountGroup.toJson();
        co_return response;

      } catch (const DrogonDbException &e) {
        co_return makeErrorResponse("database_error", "Database error while updating account head.", e.base().what());
      }

    }

    drogon::Task<dto::BaseApiResponse> GlService::deleteAccountHead(const std::string &id) {

      auto dbClient = drogon::app().getDbClient();
      auto mp = CoroMapper<GlAccountGroups>(dbClient);
      auto groupMapper = CoroMapper<GlAccountGroups>(dbClient);
      auto controlMapper = CoroMapper<GlAccountControls>(dbClient);
      auto accountMapper = CoroMapper<GlAccounts>(dbClient);

      try {
        auto existing = co_await mp.findBy(Criteria(GlAccountGroups::Cols::_id, CompareOperator::EQ, id) &&
                                           Criteria(GlAccountGroups::Cols::_is_deleted, CompareOperator::EQ, false));
        if (existing.empty()) {
          co_return makeErrorResponse("not_found", "Account head not found.");
        }

        // A head with non-deleted children, controls, or accounts cannot be deleted.
        const auto childCount = co_await groupMapper.count(Criteria(GlAccountGroups::Cols::_parent_group_id, CompareOperator::EQ, id) &&
                                                           Criteria(GlAccountGroups::Cols::_is_deleted, CompareOperator::EQ, false));
        const auto controlCount = co_await controlMapper.count(Criteria(GlAccountControls::Cols::_account_group_id, CompareOperator::EQ, id) &&
                                                               Criteria(GlAccountControls::Cols::_is_deleted, CompareOperator::EQ, false));
        const auto accountCount = co_await accountMapper.count(Criteria(GlAccounts::Cols::_account_group_id, CompareOperator::EQ, id) &&
                                                               Criteria(GlAccounts::Cols::_is_deleted, CompareOperator::EQ, false));
        if (childCount > 0 || controlCount > 0 || accountCount > 0) {
          co_return makeErrorResponse("conflict", "Account head cannot be deleted while it has child heads, controls, or accounts.");
        }

        auto accountGroup = existing.front();
        accountGroup.setIsDeleted(true);
        accountGroup.setDeletedAt(trantor::Date::now());
        co_await mp.update(accountGroup);

        co_return makeDeletedResponse(id);

      } catch (const DrogonDbException &e) {
        co_return makeErrorResponse("database_error", "Database error while deleting account head.", e.base().what());
      }

    }

    drogon::Task<dto::BaseApiResponse> GlService::getAllBankAccounts(int pageNo, int pageSize, const std::string &query) {

      auto dbClient = drogon::app().getDbClient();
      auto mp = CoroMapper<GlBankAccounts>(dbClient);

      // 1. Build the search criteria; soft-deleted rows never surface.
      Criteria searchCriteria(GlBankAccounts::Cols::_is_deleted, CompareOperator::EQ, false);
      if (!query.empty()) {
        std::string likeQuery = "%" + query + "%";
        searchCriteria = searchCriteria &&
                         (Criteria(GlBankAccounts::Cols::_bank_name, CompareOperator::Like, likeQuery) ||
                          Criteria(GlBankAccounts::Cols::_bank_branch_name, CompareOperator::Like, likeQuery) ||
                          Criteria(GlBankAccounts::Cols::_account_number, CompareOperator::Like, likeQuery));
      }

      dto::BaseApiResponse response;
      try {
        // 2. Get the total count matching the criteria
        size_t totalCount = co_await mp.count(searchCriteria);

        // 3. Find the paginated data
        Json::Value data = Json::arrayValue;
        if (totalCount > 0) {
          int offset = (pageNo - 1) * pageSize;
          auto bankAccounts = co_await mp.limit(pageSize).offset(offset).findBy(searchCriteria);

          // 4. Map the persisted rows onto the camelCase API contract
          for (const auto &bankAccount : bankAccounts) {
            Json::Value bankAccountJson = bankAccount.toJson();
            Json::Value camelCaseBankAccount;

            camelCaseBankAccount["id"] = bankAccountJson["id"];
            camelCaseBankAccount["bankId"] = bankAccountJson["bank_id"];
            camelCaseBankAccount["bankName"] = bankAccountJson["bank_name"];
            camelCaseBankAccount["bankBranchId"] = bankAccountJson["bank_branch_id"];
            camelCaseBankAccount["bankBranchName"] = bankAccountJson["bank_branch_name"];
            camelCaseBankAccount["accountId"] = bankAccountJson["account_id"];
            camelCaseBankAccount["accountName"] = bankAccountJson["account_name"];
            camelCaseBankAccount["address"] = bankAccountJson["address"];
            camelCaseBankAccount["location"] = bankAccountJson["location"];
            camelCaseBankAccount["accountNo"] = bankAccountJson["account_number"];
            camelCaseBankAccount["accountType"] = bankAccountJson["account_type"];
            camelCaseBankAccount["currencyId"] = bankAccountJson["currency_id"];
            camelCaseBankAccount["contactPerson"] = bankAccountJson["contact_person"];
            camelCaseBankAccount["contactNo"] = bankAccountJson["contact_number"];
            camelCaseBankAccount["chequeBookStart"] = bankAccountJson["cheque_book_start"];
            camelCaseBankAccount["chequeBookEnd"] = bankAccountJson["cheque_book_end"];
            camelCaseBankAccount["dateOpened"] = bankAccountJson["date_opened"];
            camelCaseBankAccount["isActive"] = bankAccountJson["is_active"];
            camelCaseBankAccount["createdAt"] = bankAccountJson["created_at"];
            camelCaseBankAccount["updatedAt"] = bankAccountJson["last_modified_at"];
            data.append(camelCaseBankAccount);
          }
        }

        co_return makePaginatedResponse(totalCount, pageNo, pageSize, data);

      } catch (const drogon::orm::DrogonDbException &e) {
        co_return makeErrorResponse("database_error", "Database error while fetching bank accounts.", e.base().what());
      }

    }

    drogon::Task<dto::BaseApiResponse> GlService::createBankAccount(const dto::BankAccountDto &dto) {

      if (dto.getBankName().empty()) {
        co_return makeErrorResponse("validation_error", "Bank name is required.");
      }
      if (dto.getBankBranchName().empty()) {
        co_return makeErrorResponse("validation_error", "Bank branch name is required.");
      }
      if (dto.getAccountId().empty()) {
        co_return makeErrorResponse("validation_error", "Linked GL account is required.");
      }
      if (dto.getAccountNo().empty()) {
        co_return makeErrorResponse("validation_error", "Bank account number is required.");
      }
      if (dto.getCurrencyId().empty()) {
        co_return makeErrorResponse("validation_error", "Currency is required.");
      }

      auto dbClient = drogon::app().getDbClient();
      auto mp = CoroMapper<GlBankAccounts>(dbClient);

      dto::BaseApiResponse response;
      try {
        GlBankAccounts newBankAccount;
        if (dto.getBankId().empty()) {
          newBankAccount.setBankIdToNull();
        } else {
          newBankAccount.setBankId(dto.getBankId());
        }
        newBankAccount.setBankName(dto.getBankName());
        if (dto.getBankBranchId().empty()) {
          newBankAccount.setBankBranchIdToNull();
        } else {
          newBankAccount.setBankBranchId(dto.getBankBranchId());
        }
        newBankAccount.setBankBranchName(dto.getBankBranchName());
        newBankAccount.setAccountId(dto.getAccountId());
        if (dto.getAccountName().empty()) {
          newBankAccount.setAccountNameToNull();
        } else {
          newBankAccount.setAccountName(dto.getAccountName());
        }
        if (dto.getAddress().empty()) {
          newBankAccount.setAddressToNull();
        } else {
          newBankAccount.setAddress(dto.getAddress());
        }
        if (dto.getLocation().empty()) {
          newBankAccount.setLocationToNull();
        } else {
          newBankAccount.setLocation(dto.getLocation());
        }
        newBankAccount.setAccountNumber(dto.getAccountNo());
        if (dto.getAccountType().empty()) {
          newBankAccount.setAccountTypeToNull();
        } else {
          newBankAccount.setAccountType(dto.getAccountType());
        }
        newBankAccount.setCurrencyId(dto.getCurrencyId());
        if (dto.getContactPerson().empty()) {
          newBankAccount.setContactPersonToNull();
        } else {
          newBankAccount.setContactPerson(dto.getContactPerson());
        }
        if (dto.getContactNo().empty()) {
          newBankAccount.setContactNumberToNull();
        } else {
          newBankAccount.setContactNumber(dto.getContactNo());
        }
        if (dto.getChequeBookStart().empty()) {
          newBankAccount.setChequeBookStartToNull();
        } else {
          newBankAccount.setChequeBookStart(dto.getChequeBookStart());
        }
        if (dto.getChequeBookEnd().empty()) {
          newBankAccount.setChequeBookEndToNull();
        } else {
          newBankAccount.setChequeBookEnd(dto.getChequeBookEnd());
        }
        if (dto.getDateOpened().empty()) {
          newBankAccount.setDateOpenedToNull();
        } else {
          unsigned int year = 0;
          unsigned int month = 0;
          unsigned int day = 0;
          if (std::sscanf(dto.getDateOpened().c_str(), "%u-%u-%u", &year, &month, &day) == 3) {
            newBankAccount.setDateOpened(trantor::Date(year, month, day));
          } else {
            newBankAccount.setDateOpenedToNull();
          }
        }
        newBankAccount.setIsActive(true);

        auto result = co_await mp.insert(newBankAccount);
        response.success = true;
        response.result = result.toJson();

      } catch (const DrogonDbException &e) {
        response.success = false;
        response.error["code"] = "database_error";
        response.error["message"] = "Database error while creating bank account.";
        response.error["detail"] = e.base().what();
      }
      co_return response;

    }

    drogon::Task<dto::BaseApiResponse> GlService::updateBankAccount(const dto::BankAccountDto &dto, const std::string &id) {

      if (dto.getBankName().empty()) {
        co_return makeErrorResponse("validation_error", "Bank name is required.");
      }
      if (dto.getBankBranchName().empty()) {
        co_return makeErrorResponse("validation_error", "Bank branch name is required.");
      }
      if (dto.getAccountId().empty()) {
        co_return makeErrorResponse("validation_error", "Linked GL account is required.");
      }
      if (dto.getAccountNo().empty()) {
        co_return makeErrorResponse("validation_error", "Bank account number is required.");
      }
      if (dto.getCurrencyId().empty()) {
        co_return makeErrorResponse("validation_error", "Currency is required.");
      }

      auto dbClient = drogon::app().getDbClient();
      auto mp = CoroMapper<GlBankAccounts>(dbClient);

      dto::BaseApiResponse response;
      try {
        auto existing = co_await mp.findBy(Criteria(GlBankAccounts::Cols::_id, CompareOperator::EQ, id) &&
                                           Criteria(GlBankAccounts::Cols::_is_deleted, CompareOperator::EQ, false));
        if (existing.empty()) {
          co_return makeErrorResponse("not_found", "Bank account not found.");
        }
        auto bankAccount = existing.front();

        if (dto.getBankId().empty()) {
          bankAccount.setBankIdToNull();
        } else {
          bankAccount.setBankId(dto.getBankId());
        }
        bankAccount.setBankName(dto.getBankName());
        if (dto.getBankBranchId().empty()) {
          bankAccount.setBankBranchIdToNull();
        } else {
          bankAccount.setBankBranchId(dto.getBankBranchId());
        }
        bankAccount.setBankBranchName(dto.getBankBranchName());
        bankAccount.setAccountId(dto.getAccountId());
        if (dto.getAccountName().empty()) {
          bankAccount.setAccountNameToNull();
        } else {
          bankAccount.setAccountName(dto.getAccountName());
        }
        if (dto.getAddress().empty()) {
          bankAccount.setAddressToNull();
        } else {
          bankAccount.setAddress(dto.getAddress());
        }
        if (dto.getLocation().empty()) {
          bankAccount.setLocationToNull();
        } else {
          bankAccount.setLocation(dto.getLocation());
        }
        bankAccount.setAccountNumber(dto.getAccountNo());
        if (dto.getAccountType().empty()) {
          bankAccount.setAccountTypeToNull();
        } else {
          bankAccount.setAccountType(dto.getAccountType());
        }
        bankAccount.setCurrencyId(dto.getCurrencyId());
        if (dto.getContactPerson().empty()) {
          bankAccount.setContactPersonToNull();
        } else {
          bankAccount.setContactPerson(dto.getContactPerson());
        }
        if (dto.getContactNo().empty()) {
          bankAccount.setContactNumberToNull();
        } else {
          bankAccount.setContactNumber(dto.getContactNo());
        }
        if (dto.getChequeBookStart().empty()) {
          bankAccount.setChequeBookStartToNull();
        } else {
          bankAccount.setChequeBookStart(dto.getChequeBookStart());
        }
        if (dto.getChequeBookEnd().empty()) {
          bankAccount.setChequeBookEndToNull();
        } else {
          bankAccount.setChequeBookEnd(dto.getChequeBookEnd());
        }
        if (dto.getDateOpened().empty()) {
          bankAccount.setDateOpenedToNull();
        } else {
          unsigned int year = 0;
          unsigned int month = 0;
          unsigned int day = 0;
          if (std::sscanf(dto.getDateOpened().c_str(), "%u-%u-%u", &year, &month, &day) == 3) {
            bankAccount.setDateOpened(trantor::Date(year, month, day));
          } else {
            bankAccount.setDateOpenedToNull();
          }
        }
        bankAccount.setLastModifiedAt(trantor::Date::now());

        co_await mp.update(bankAccount);
        response.success = true;
        response.result = bankAccount.toJson();

      } catch (const DrogonDbException &e) {
        response.success = false;
        response.error["code"] = "database_error";
        response.error["message"] = "Database error while updating bank account.";
        response.error["detail"] = e.base().what();
      }
      co_return response;

    }

    drogon::Task<dto::BaseApiResponse> GlService::deleteBankAccount(const std::string &id) {

      auto dbClient = drogon::app().getDbClient();
      auto mp = CoroMapper<GlBankAccounts>(dbClient);

      dto::BaseApiResponse response;
      try {
        auto existing = co_await mp.findBy(Criteria(GlBankAccounts::Cols::_id, CompareOperator::EQ, id) &&
                                           Criteria(GlBankAccounts::Cols::_is_deleted, CompareOperator::EQ, false));
        if (existing.empty()) {
          co_return makeErrorResponse("not_found", "Bank account not found.");
        }

        auto bankAccount = existing.front();
        bankAccount.setIsDeleted(true);
        bankAccount.setDeletedAt(trantor::Date::now());
        co_await mp.update(bankAccount);

        co_return makeDeletedResponse(id);

      } catch (const DrogonDbException &e) {
        co_return makeErrorResponse("database_error", "Database error while deleting bank account.", e.base().what());
      }

    }

    drogon::Task<dto::BaseApiResponse> GlService::getAllCoaControls(int pageNo, int pageSize, const std::string &query) {

      auto dbClient = drogon::app().getDbClient();
      auto mp = CoroMapper<GlAccountControls>(dbClient);

      // 1. Build the search criteria; soft-deleted rows never surface.
      Criteria searchCriteria(GlAccountControls::Cols::_is_deleted, CompareOperator::EQ, false);
      if (!query.empty()) {
        std::string likeQuery = "%" + query + "%";
        searchCriteria = searchCriteria && Criteria(GlAccountControls::Cols::_account_header_name, CompareOperator::Like, likeQuery);
      }

      try {
        // 2. Get the total count matching the criteria
        size_t totalCount = co_await mp.count(searchCriteria);

        // 3. Find the paginated data
        Json::Value data = Json::arrayValue;
        if (totalCount > 0) {
          int offset = (pageNo - 1) * pageSize;
          auto accountControls = co_await mp.limit(pageSize).offset(offset).findBy(searchCriteria);

          // 4. Map the persisted rows onto the camelCase API contract
          for (const auto &accountControl : accountControls) {
            Json::Value accountControlJson = accountControl.toJson();
            Json::Value camelCaseAccountControl;

            camelCaseAccountControl["id"] = accountControlJson["id"];
            camelCaseAccountControl["name"] = accountControlJson["account_header_name"];
            camelCaseAccountControl["minAccount"] = accountControlJson["min_account"];
            camelCaseAccountControl["maxAccount"] = accountControlJson["max_account"];
            camelCaseAccountControl["accountHeadId"] = accountControlJson["account_group_id"];
            camelCaseAccountControl["parentControlId"] = accountControlJson["parent_account_header_id"];
            camelCaseAccountControl["isActive"] = accountControlJson["is_active"];
            camelCaseAccountControl["createdAt"] = accountControlJson["created_at"];
            camelCaseAccountControl["updatedAt"] = accountControlJson["last_modified_at"];
            data.append(camelCaseAccountControl);
          }
        }

        co_return makePaginatedResponse(totalCount, pageNo, pageSize, data);

      } catch (const drogon::orm::DrogonDbException &e) {
        co_return makeErrorResponse("database_error", "Database error while fetching account controls.", e.base().what());
      }

    }

    drogon::Task<dto::BaseApiResponse> GlService::createCoaControl(const dto::ChartOfAccountControlDto &dto) {

      if (dto.getName().empty()) {
        co_return makeErrorResponse("validation_error", "Account control name is required.");
      }
      if (dto.getAccountHeadId().empty()) {
        co_return makeErrorResponse("validation_error", "Account head is required.");
      }
      if (dto.getMinAccount() < 0 || dto.getMaxAccount() < 0 || dto.getMinAccount() > dto.getMaxAccount()) {
        co_return makeErrorResponse("validation_error", "Account range must be non-negative and minAccount must not exceed maxAccount.");
      }

      auto dbClient = drogon::app().getDbClient();
      auto mp = CoroMapper<GlAccountControls>(dbClient);

      try {
        auto parentError = co_await validateAccountControlParent(dbClient, dto.getParentControlId(), dto.getAccountHeadId(),
                                                                 dto.getMinAccount(), dto.getMaxAccount());
        if (!parentError.empty()) {
          co_return makeErrorResponse("validation_error", parentError);
        }
        auto siblingError = co_await validateAccountControlSiblings(dbClient, std::string(), dto.getAccountHeadId(),
                                                                    dto.getParentControlId(), dto.getName(),
                                                                    dto.getMinAccount(), dto.getMaxAccount());
        if (!siblingError.empty()) {
          co_return makeErrorResponse("conflict", siblingError);
        }

        GlAccountControls newAccountControl;
        newAccountControl.setAccountGroupId(dto.getAccountHeadId());
        if (dto.getParentControlId().empty()) {
          newAccountControl.setParentAccountHeaderIdToNull();
        } else {
          newAccountControl.setParentAccountHeaderId(dto.getParentControlId());
        }
        newAccountControl.setAccountHeaderName(dto.getName());
        newAccountControl.setMinAccount(dto.getMinAccount());
        newAccountControl.setMaxAccount(dto.getMaxAccount());
        newAccountControl.setIsActive(true);

        auto result = co_await mp.insert(newAccountControl);
        dto::BaseApiResponse response;
        response.success = true;
        response.result = result.toJson();
        co_return response;

      } catch (const DrogonDbException &e) {
        co_return makeErrorResponse("database_error", "Database error while creating account control.", e.base().what());
      }

    }

    drogon::Task<dto::BaseApiResponse> GlService::updateCoaControl(const dto::ChartOfAccountControlDto &dto, const std::string &id) {

      if (dto.getName().empty()) {
        co_return makeErrorResponse("validation_error", "Account control name is required.");
      }
      if (dto.getAccountHeadId().empty()) {
        co_return makeErrorResponse("validation_error", "Account head is required.");
      }
      if (dto.getMinAccount() < 0 || dto.getMaxAccount() < 0 || dto.getMinAccount() > dto.getMaxAccount()) {
        co_return makeErrorResponse("validation_error", "Account range must be non-negative and minAccount must not exceed maxAccount.");
      }

      auto dbClient = drogon::app().getDbClient();
      auto mp = CoroMapper<GlAccountControls>(dbClient);
      auto accountMapper = CoroMapper<GlAccounts>(dbClient);

      try {
        auto existing = co_await mp.findBy(Criteria(GlAccountControls::Cols::_id, CompareOperator::EQ, id) &&
                                           Criteria(GlAccountControls::Cols::_is_deleted, CompareOperator::EQ, false));
        if (existing.empty()) {
          co_return makeErrorResponse("not_found", "Account control not found.");
        }
        auto accountControl = existing.front();

        auto parentError = co_await validateAccountControlParent(dbClient, dto.getParentControlId(), dto.getAccountHeadId(),
                                                                 dto.getMinAccount(), dto.getMaxAccount());
        if (!parentError.empty()) {
          co_return makeErrorResponse("validation_error", parentError);
        }
        auto siblingError = co_await validateAccountControlSiblings(dbClient, id, dto.getAccountHeadId(),
                                                                    dto.getParentControlId(), dto.getName(),
                                                                    dto.getMinAccount(), dto.getMaxAccount());
        if (!siblingError.empty()) {
          co_return makeErrorResponse("conflict", siblingError);
        }

        // A header cannot move to another account head while it has dependents.
        if (accountControl.getValueOfAccountGroupId() != dto.getAccountHeadId()) {
          const auto childControlCount = co_await mp.count(Criteria(GlAccountControls::Cols::_parent_account_header_id, CompareOperator::EQ, id) &&
                                                           Criteria(GlAccountControls::Cols::_is_deleted, CompareOperator::EQ, false));
          const auto accountCount = co_await accountMapper.count(Criteria(GlAccounts::Cols::_account_header_id, CompareOperator::EQ, id) &&
                                                                 Criteria(GlAccounts::Cols::_is_deleted, CompareOperator::EQ, false));
          if (childControlCount > 0 || accountCount > 0) {
            co_return makeErrorResponse("conflict", "Account control cannot be moved to another account head while it has dependents.");
          }
        }

        // A header range cannot shrink around its child controls or detail accounts.
        if (dto.getMinAccount() > accountControl.getValueOfMinAccount() || dto.getMaxAccount() < accountControl.getValueOfMaxAccount()) {
          auto childControls = co_await mp.findBy(Criteria(GlAccountControls::Cols::_parent_account_header_id, CompareOperator::EQ, id) &&
                                                  Criteria(GlAccountControls::Cols::_is_deleted, CompareOperator::EQ, false));
          for (const auto &childControl : childControls) {
            if (childControl.getValueOfMinAccount() < dto.getMinAccount() || childControl.getValueOfMaxAccount() > dto.getMaxAccount()) {
              co_return makeErrorResponse("conflict", "Account control range cannot shrink around child controls.");
            }
          }
          auto detailAccounts = co_await accountMapper.findBy(Criteria(GlAccounts::Cols::_account_header_id, CompareOperator::EQ, id) &&
                                                              Criteria(GlAccounts::Cols::_is_deleted, CompareOperator::EQ, false));
          for (const auto &detailAccount : detailAccounts) {
            try {
              const int accountNumber = std::stoi(detailAccount.getValueOfAccountNumber());
              if (accountNumber < dto.getMinAccount() || accountNumber > dto.getMaxAccount()) {
                co_return makeErrorResponse("conflict", "Account control range cannot shrink around detail accounts.");
              }
            } catch (const std::exception &) {
              // Non-numeric account numbers are skipped here; they are rejected by the database constraint.
            }
          }
        }

        accountControl.setAccountGroupId(dto.getAccountHeadId());
        if (dto.getParentControlId().empty()) {
          accountControl.setParentAccountHeaderIdToNull();
        } else {
          accountControl.setParentAccountHeaderId(dto.getParentControlId());
        }
        accountControl.setAccountHeaderName(dto.getName());
        accountControl.setMinAccount(dto.getMinAccount());
        accountControl.setMaxAccount(dto.getMaxAccount());
        accountControl.setLastModifiedAt(trantor::Date::now());

        co_await mp.update(accountControl);

        dto::BaseApiResponse response;
        response.success = true;
        response.result = accountControl.toJson();
        co_return response;

      } catch (const DrogonDbException &e) {
        co_return makeErrorResponse("database_error", "Database error while updating account control.", e.base().what());
      }

    }

    drogon::Task<dto::BaseApiResponse> GlService::deleteCoaControl(const std::string &id) {

      auto dbClient = drogon::app().getDbClient();
      auto mp = CoroMapper<GlAccountControls>(dbClient);
      auto accountMapper = CoroMapper<GlAccounts>(dbClient);

      try {
        auto existing = co_await mp.findBy(Criteria(GlAccountControls::Cols::_id, CompareOperator::EQ, id) &&
                                           Criteria(GlAccountControls::Cols::_is_deleted, CompareOperator::EQ, false));
        if (existing.empty()) {
          co_return makeErrorResponse("not_found", "Account control not found.");
        }

        // Deletion is blocked while child controls or detail accounts remain.
        const auto childControlCount = co_await mp.count(Criteria(GlAccountControls::Cols::_parent_account_header_id, CompareOperator::EQ, id) &&
                                                         Criteria(GlAccountControls::Cols::_is_deleted, CompareOperator::EQ, false));
        const auto accountCount = co_await accountMapper.count(Criteria(GlAccounts::Cols::_account_header_id, CompareOperator::EQ, id) &&
                                                               Criteria(GlAccounts::Cols::_is_deleted, CompareOperator::EQ, false));
        if (childControlCount > 0 || accountCount > 0) {
          co_return makeErrorResponse("conflict", "Account control cannot be deleted while it has child controls or detail accounts.");
        }

        auto accountControl = existing.front();
        accountControl.setIsDeleted(true);
        accountControl.setDeletedAt(trantor::Date::now());
        co_await mp.update(accountControl);

        co_return makeDeletedResponse(id);

      } catch (const DrogonDbException &e) {
        co_return makeErrorResponse("database_error", "Database error while deleting account control.", e.base().what());
      }

    }

    drogon::Task<dto::BaseApiResponse> GlService::getAllCoaDetails(int pageNo, int pageSize, const std::string &query) {

      auto dbClient = drogon::app().getDbClient();
      auto mp = CoroMapper<GlAccounts>(dbClient);

      // 1. Build the search criteria; soft-deleted rows never surface.
      Criteria searchCriteria(GlAccounts::Cols::_is_deleted, CompareOperator::EQ, false);
      if (!query.empty()) {
        std::string likeQuery = "%" + query + "%";
        searchCriteria = searchCriteria &&
                         (Criteria(GlAccounts::Cols::_account_name, CompareOperator::Like, likeQuery) ||
                          Criteria(GlAccounts::Cols::_account_number, CompareOperator::Like, likeQuery));
      }

      try {
        // 2. Get the total count matching the criteria
        size_t totalCount = co_await mp.count(searchCriteria);

        // 3. Find the paginated data
        Json::Value data = Json::arrayValue;
        if (totalCount > 0) {
          int offset = (pageNo - 1) * pageSize;
          auto accountDetails = co_await mp.limit(pageSize).offset(offset).findBy(searchCriteria);

          // 4. Map the persisted rows onto the camelCase API contract
          for (const auto &accountDetail : accountDetails) {
            Json::Value accountDetailJson = accountDetail.toJson();
            Json::Value camelCaseAccountDetail;

            camelCaseAccountDetail["id"] = accountDetailJson["id"];
            camelCaseAccountDetail["accountName"] = accountDetailJson["account_name"];
            camelCaseAccountDetail["accountNo"] = accountDetailJson["account_number"];
            camelCaseAccountDetail["status"] = accountDetailJson["status"];
            camelCaseAccountDetail["accountControlId"] = accountDetailJson["account_header_id"];
            camelCaseAccountDetail["accountGroupId"] = accountDetailJson["account_group_id"];
            camelCaseAccountDetail["currencyId"] = accountDetailJson["currency_id"];
            camelCaseAccountDetail["standardAccountType"] = accountDetailJson["standard_account_type"];
            camelCaseAccountDetail["allowManualPosting"] = accountDetailJson["allow_manual_posting"];
            camelCaseAccountDetail["isControlAccount"] = accountDetailJson["is_control_account"];
            camelCaseAccountDetail["createdAt"] = accountDetailJson["created_at"];
            camelCaseAccountDetail["updatedAt"] = accountDetailJson["last_modified_at"];
            data.append(camelCaseAccountDetail);
          }
        }

        co_return makePaginatedResponse(totalCount, pageNo, pageSize, data);

      } catch (const drogon::orm::DrogonDbException &e) {
        co_return makeErrorResponse("database_error", "Database error while fetching account details.", e.base().what());
      }

    }

    drogon::Task<dto::BaseApiResponse> GlService::createCoaDetail(const dto::ChartOfAccountDetailDto &dto) {

      if (dto.getAccountName().empty()) {
        co_return makeErrorResponse("validation_error", "Account name is required.");
      }
      if (dto.getAccountControlId().empty()) {
        co_return makeErrorResponse("validation_error", "Account control is required.");
      }

      auto dbClient = drogon::app().getDbClient();
      auto mp = CoroMapper<GlAccounts>(dbClient);
      auto controlMapper = CoroMapper<GlAccountControls>(dbClient);
      auto groupMapper = CoroMapper<GlAccountGroups>(dbClient);

      try {
        // Detail accounts inherit their control header, account group, and
        // standard account type from the persisted chart-of-accounts structure.
        auto controls = co_await controlMapper.findBy(Criteria(GlAccountControls::Cols::_id, CompareOperator::EQ, dto.getAccountControlId()) &&
                                                      Criteria(GlAccountControls::Cols::_is_deleted, CompareOperator::EQ, false));
        if (controls.empty()) {
          co_return makeErrorResponse("validation_error", "Referenced account control not found.");
        }
        const auto &accountControl = controls.front();
        if (!accountControl.getValueOfIsActive()) {
          co_return makeErrorResponse("validation_error", "Account control must be active.");
        }
        const auto childControlCount = co_await controlMapper.count(Criteria(GlAccountControls::Cols::_parent_account_header_id, CompareOperator::EQ, dto.getAccountControlId()) &&
                                                                    Criteria(GlAccountControls::Cols::_is_deleted, CompareOperator::EQ, false));
        if (childControlCount > 0) {
          co_return makeErrorResponse("validation_error", "Account control must be a leaf header.");
        }

        auto groups = co_await groupMapper.findBy(Criteria(GlAccountGroups::Cols::_id, CompareOperator::EQ, accountControl.getValueOfAccountGroupId()) &&
                                                  Criteria(GlAccountGroups::Cols::_is_deleted, CompareOperator::EQ, false));
        if (groups.empty()) {
          co_return makeErrorResponse("validation_error", "Referenced account head not found.");
        }
        if (!groups.front().getValueOfIsActive()) {
          co_return makeErrorResponse("validation_error", "Account head must be active.");
        }

        if (dto.getAccountNo() < accountControl.getValueOfMinAccount() || dto.getAccountNo() > accountControl.getValueOfMaxAccount()) {
          co_return makeErrorResponse("validation_error", "Account number must be within the account control range.");
        }

        // Account numbers are unique for the accounting unit, including numbers on soft-deleted records.
        const auto duplicateCount = co_await mp.count(Criteria(GlAccounts::Cols::_account_number, CompareOperator::EQ, std::to_string(dto.getAccountNo())));
        if (duplicateCount > 0) {
          co_return makeErrorResponse("conflict", "An account with this number already exists.");
        }

        GlAccounts newAccount;
        newAccount.setAccountHeaderId(dto.getAccountControlId());
        newAccount.setAccountGroupId(accountControl.getValueOfAccountGroupId());
        newAccount.setAccountNumber(std::to_string(dto.getAccountNo()));
        newAccount.setAccountName(dto.getAccountName());
        newAccount.setStatus(dto.getStatus() == static_cast<int>(constants::AccountStatus::Active) ? "active" : "inactive");
        if (dto.getCurrencyId().empty()) {
          newAccount.setCurrencyIdToNull();
        } else {
          newAccount.setCurrencyId(dto.getCurrencyId());
        }
        newAccount.setStandardAccountType(groups.front().getValueOfStandardAccountType());
        newAccount.setAllowManualPosting(true);
        newAccount.setIsControlAccount(false);

        auto result = co_await mp.insert(newAccount);
        dto::BaseApiResponse response;
        response.success = true;
        response.result = result.toJson();
        co_return response;

      } catch (const DrogonDbException &e) {
        co_return makeErrorResponse("database_error", "Database error while creating account detail.", e.base().what());
      }

    }

    drogon::Task<dto::BaseApiResponse> GlService::updateCoaDetail(const dto::ChartOfAccountDetailDto &dto, const std::string &id) {

      if (dto.getAccountName().empty()) {
        co_return makeErrorResponse("validation_error", "Account name is required.");
      }

      auto dbClient = drogon::app().getDbClient();
      auto mp = CoroMapper<GlAccounts>(dbClient);
      auto controlMapper = CoroMapper<GlAccountControls>(dbClient);
      auto groupMapper = CoroMapper<GlAccountGroups>(dbClient);

      try {
        auto existing = co_await mp.findBy(Criteria(GlAccounts::Cols::_id, CompareOperator::EQ, id) &&
                                           Criteria(GlAccounts::Cols::_is_deleted, CompareOperator::EQ, false));
        if (existing.empty()) {
          co_return makeErrorResponse("not_found", "Account detail not found.");
        }
        auto account = existing.front();

        // Keep the inherited header, group, and standard type unless the
        // request explicitly points at a different control header.
        bool hasHeader = static_cast<bool>(account.getAccountHeaderId());
        std::string accountHeaderId = hasHeader ? *account.getAccountHeaderId() : std::string();
        std::string accountGroupId = account.getValueOfAccountGroupId();
        short standardAccountType = account.getValueOfStandardAccountType();

        if (!dto.getAccountControlId().empty()) {
          auto controls = co_await controlMapper.findBy(Criteria(GlAccountControls::Cols::_id, CompareOperator::EQ, dto.getAccountControlId()) &&
                                                        Criteria(GlAccountControls::Cols::_is_deleted, CompareOperator::EQ, false));
          if (controls.empty()) {
            co_return makeErrorResponse("validation_error", "Referenced account control not found.");
          }
          const auto &accountControl = controls.front();
          if (!accountControl.getValueOfIsActive()) {
            co_return makeErrorResponse("validation_error", "Account control must be active.");
          }
          const auto childControlCount = co_await controlMapper.count(Criteria(GlAccountControls::Cols::_parent_account_header_id, CompareOperator::EQ, dto.getAccountControlId()) &&
                                                                      Criteria(GlAccountControls::Cols::_is_deleted, CompareOperator::EQ, false));
          if (childControlCount > 0) {
            co_return makeErrorResponse("validation_error", "Account control must be a leaf header.");
          }

          auto groups = co_await groupMapper.findBy(Criteria(GlAccountGroups::Cols::_id, CompareOperator::EQ, accountControl.getValueOfAccountGroupId()) &&
                                                    Criteria(GlAccountGroups::Cols::_is_deleted, CompareOperator::EQ, false));
          if (groups.empty()) {
            co_return makeErrorResponse("validation_error", "Referenced account head not found.");
          }
          if (!groups.front().getValueOfIsActive()) {
            co_return makeErrorResponse("validation_error", "Account head must be active.");
          }

          if (dto.getAccountNo() < accountControl.getValueOfMinAccount() || dto.getAccountNo() > accountControl.getValueOfMaxAccount()) {
            co_return makeErrorResponse("validation_error", "Account number must be within the account control range.");
          }

          hasHeader = true;
          accountHeaderId = dto.getAccountControlId();
          accountGroupId = accountControl.getValueOfAccountGroupId();
          standardAccountType = groups.front().getValueOfStandardAccountType();
        }

        // Account numbers are unique for the accounting unit, including numbers on soft-deleted records.
        const auto duplicateCount = co_await mp.count(Criteria(GlAccounts::Cols::_account_number, CompareOperator::EQ, std::to_string(dto.getAccountNo())) &&
                                                      Criteria(GlAccounts::Cols::_id, CompareOperator::NE, id));
        if (duplicateCount > 0) {
          co_return makeErrorResponse("conflict", "An account with this number already exists.");
        }

        if (hasHeader) {
          account.setAccountHeaderId(accountHeaderId);
        } else {
          account.setAccountHeaderIdToNull();
        }
        account.setAccountGroupId(accountGroupId);
        account.setAccountNumber(std::to_string(dto.getAccountNo()));
        account.setAccountName(dto.getAccountName());
        account.setStatus(dto.getStatus() == static_cast<int>(constants::AccountStatus::Active) ? "active" : "inactive");
        if (dto.getCurrencyId().empty()) {
          account.setCurrencyIdToNull();
        } else {
          account.setCurrencyId(dto.getCurrencyId());
        }
        account.setStandardAccountType(standardAccountType);
        account.setLastModifiedAt(trantor::Date::now());

        co_await mp.update(account);

        dto::BaseApiResponse response;
        response.success = true;
        response.result = account.toJson();
        co_return response;

      } catch (const DrogonDbException &e) {
        co_return makeErrorResponse("database_error", "Database error while updating account detail.", e.base().what());
      }

    }

    drogon::Task<dto::BaseApiResponse> GlService::deleteCoaDetail(const std::string &id) {

      auto dbClient = drogon::app().getDbClient();
      auto mp = CoroMapper<GlAccounts>(dbClient);

      try {
        auto existing = co_await mp.findBy(Criteria(GlAccounts::Cols::_id, CompareOperator::EQ, id) &&
                                           Criteria(GlAccounts::Cols::_is_deleted, CompareOperator::EQ, false));
        if (existing.empty()) {
          co_return makeErrorResponse("not_found", "Account detail not found.");
        }

        auto account = existing.front();
        account.setIsDeleted(true);
        account.setDeletedAt(trantor::Date::now());
        co_await mp.update(account);

        co_return makeDeletedResponse(id);

      } catch (const DrogonDbException &e) {
        co_return makeErrorResponse("database_error", "Database error while deleting account detail.", e.base().what());
      }

    }

}
