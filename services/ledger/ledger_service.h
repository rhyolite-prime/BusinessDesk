#pragma once

#include "dto/LedgerAccountSetupDto.h"

#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

#if defined(__cpp_impl_coroutine)
#include <drogon/orm/DbClient.h>
#include <drogon/utils/coroutine.h>
#endif

namespace businessdesk::ledger
{
struct JournalLineDraft
{
    std::string accountId;
    std::string description;
    std::string debit;
    std::string credit;
};

struct JournalDraft
{
    std::string batchDate;
    std::string description;
    std::vector<JournalLineDraft> lines;
};

struct JournalValidation
{
    bool valid{false};
    bool balanced{false};
    std::string debitTotal{"0.000000"};
    std::string creditTotal{"0.000000"};
    std::vector<std::string> errors;
};

enum class LedgerErrorCode
{
    Validation,
    NotFound,
    Conflict,
    Unavailable
};

class LedgerServiceError final : public std::runtime_error
{
  public:
    LedgerServiceError(LedgerErrorCode code,
                       std::string message,
                       std::vector<std::string> details = {})
        : std::runtime_error(std::move(message)),
          code_(code),
          details_(std::move(details))
    {
    }

    [[nodiscard]] LedgerErrorCode code() const noexcept { return code_; }
    [[nodiscard]] const std::vector<std::string> &details() const noexcept
    {
        return details_;
    }

  private:
    LedgerErrorCode code_;
    std::vector<std::string> details_;
};

// The GL module's single service owns account-setup rules, journal invariants,
// and ORM-backed GL use cases. Rule validation remains framework-independent
// so it can be tested without PostgreSQL or Drogon.
class LedgerService final
{
  public:
    [[nodiscard]] JournalValidation validateJournalDraft(const JournalDraft &draft) const;
    [[nodiscard]] JournalValidation validateJournalForApproval(const JournalDraft &draft) const;

    [[nodiscard]] std::vector<std::string> validateAccountHeadInput(
        const dto::AccountHeadInput &input) const;
    [[nodiscard]] std::vector<std::string> validateAccountControlInput(
        const dto::AccountControlInput &input) const;
    [[nodiscard]] std::vector<std::string> validateAccountDetailInput(
        const dto::AccountDetailInput &input) const;

#if defined(__cpp_impl_coroutine)
    [[nodiscard]] drogon::Task<std::vector<dto::AccountHeadDto>> listAccountHeads(
        drogon::orm::DbClientPtr db,
        dto::LedgerScope scope) const;
    [[nodiscard]] drogon::Task<dto::AccountHeadDto> getAccountHead(
        drogon::orm::DbClientPtr db,
        dto::LedgerScope scope,
        std::string id) const;
    [[nodiscard]] drogon::Task<dto::AccountHeadDto> createAccountHead(
        drogon::orm::DbClientPtr db,
        dto::LedgerScope scope,
        dto::AccountHeadInput input) const;
    [[nodiscard]] drogon::Task<dto::AccountHeadDto> updateAccountHead(
        drogon::orm::DbClientPtr db,
        dto::LedgerScope scope,
        std::string id,
        dto::AccountHeadInput input) const;
    [[nodiscard]] drogon::Task<std::string> deleteAccountHead(
        drogon::orm::DbClientPtr db,
        dto::LedgerScope scope,
        std::string id) const;

    [[nodiscard]] drogon::Task<std::vector<dto::AccountControlDto>> listAccountControls(
        drogon::orm::DbClientPtr db,
        dto::LedgerScope scope,
        dto::AccountControlFilter filter) const;
    [[nodiscard]] drogon::Task<dto::AccountControlDto> getAccountControl(
        drogon::orm::DbClientPtr db,
        dto::LedgerScope scope,
        std::string id) const;
    [[nodiscard]] drogon::Task<dto::AccountControlDto> createAccountControl(
        drogon::orm::DbClientPtr db,
        dto::LedgerScope scope,
        dto::AccountControlInput input) const;
    [[nodiscard]] drogon::Task<dto::AccountControlDto> updateAccountControl(
        drogon::orm::DbClientPtr db,
        dto::LedgerScope scope,
        std::string id,
        dto::AccountControlInput input) const;
    [[nodiscard]] drogon::Task<std::string> deleteAccountControl(
        drogon::orm::DbClientPtr db,
        dto::LedgerScope scope,
        std::string id) const;

    [[nodiscard]] drogon::Task<std::vector<dto::AccountDetailDto>> listAccountDetails(
        drogon::orm::DbClientPtr db,
        dto::LedgerScope scope,
        dto::AccountDetailFilter filter) const;
    [[nodiscard]] drogon::Task<dto::AccountDetailDto> getAccountDetail(
        drogon::orm::DbClientPtr db,
        dto::LedgerScope scope,
        std::string id) const;
    [[nodiscard]] drogon::Task<dto::AccountDetailDto> createAccountDetail(
        drogon::orm::DbClientPtr db,
        dto::LedgerScope scope,
        dto::AccountDetailInput input) const;
    [[nodiscard]] drogon::Task<dto::AccountDetailDto> updateAccountDetail(
        drogon::orm::DbClientPtr db,
        dto::LedgerScope scope,
        std::string id,
        dto::AccountDetailInput input) const;
    [[nodiscard]] drogon::Task<std::string> deleteAccountDetail(
        drogon::orm::DbClientPtr db,
        dto::LedgerScope scope,
        std::string id) const;
#endif
};
}  // namespace businessdesk::ledger
