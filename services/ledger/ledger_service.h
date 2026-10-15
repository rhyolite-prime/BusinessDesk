#pragma once

#include <string>
#include <vector>

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

// The GL module's single service owns journal invariants and, as persistence is
// added, the transactional GL use cases. This validation is deliberately pure
// so it can be tested without PostgreSQL or a running Drogon application.
class LedgerService final
{
  public:
    [[nodiscard]] JournalValidation validateJournalDraft(const JournalDraft &draft) const;
    [[nodiscard]] JournalValidation validateJournalForApproval(const JournalDraft &draft) const;
};
}  // namespace businessdesk::ledger
