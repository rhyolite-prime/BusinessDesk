#include "services/ledger/ledger_service.h"

#include <iostream>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

namespace
{
using businessdesk::ledger::JournalDraft;
using businessdesk::ledger::JournalLineDraft;
using businessdesk::ledger::LedgerService;

void expect(bool condition, const std::string &message)
{
    if (!condition)
    {
        throw std::runtime_error(message);
    }
}

JournalLineDraft line(std::string accountId, std::string debit, std::string credit)
{
    return {std::move(accountId), "test line", std::move(debit), std::move(credit)};
}
}  // namespace

int main()
{
    try
    {
        const LedgerService service;

        const JournalDraft preciseBalanced{
            "2024-02-29",
            "Exact decimal addition",
            {line("cash", "0.1", "0"), line("fees", "0.2", "0"), line("revenue", "0", "0.3")}};
        const auto preciseResult = service.validateJournalDraft(preciseBalanced);
        expect(preciseResult.valid, "A well-formed balanced journal draft should be valid.");
        expect(preciseResult.balanced, "Decimal totals 0.1 + 0.2 must exactly equal 0.3.");
        expect(preciseResult.debitTotal == "0.300000", "Debit totals should be normalized to six places.");
        expect(preciseResult.creditTotal == "0.300000", "Credit totals should be normalized to six places.");

        const JournalDraft unbalanced{"2026-10-15",
                                     "Unbalanced draft is allowed",
                                     {line("cash", "100.00", "0"), line("revenue", "0", "90.00")}};
        const auto draftResult = service.validateJournalDraft(unbalanced);
        expect(draftResult.valid, "A structurally valid unbalanced draft can be saved.");
        expect(!draftResult.balanced, "An unbalanced draft must be reported as unbalanced.");
        const auto approvalResult = service.validateJournalForApproval(unbalanced);
        expect(!approvalResult.valid, "An unbalanced journal must not pass approval validation.");
        expect(!approvalResult.errors.empty(), "Approval validation should explain the balance failure.");

        const JournalDraft bothSides{"2026-10-15",
                                     "Both sides on one line",
                                     {line("cash", "10", "1"), line("revenue", "0", "9")}};
        expect(!service.validateJournalDraft(bothSides).valid,
               "A journal line cannot contain both debit and credit amounts.");

        const JournalDraft invalidDate{"2026-02-29",
                                       "Invalid non-leap date",
                                       {line("cash", "1", "0"), line("revenue", "0", "1")}};
        expect(!service.validateJournalDraft(invalidDate).valid,
               "A date that does not exist in the calendar must be rejected.");

        const JournalDraft excessiveScale{"2026-10-15",
                                          "Too many decimal places",
                                          {line("cash", "1.0000001", "0"), line("revenue", "0", "1")}};
        expect(!service.validateJournalDraft(excessiveScale).valid,
               "Amounts with more than six decimal places must be rejected.");

        const JournalDraft zeroLine{"2026-10-15",
                                    "Zero line",
                                    {line("cash", "0.000000", "0"), line("revenue", "0", "1")}};
        expect(!service.validateJournalDraft(zeroLine).valid,
               "A journal line with no debit or credit must be rejected.");

        std::cout << "LedgerService validation tests passed.\n";
        return 0;
    }
    catch (const std::exception &error)
    {
        std::cerr << "LedgerService validation test failed: " << error.what() << '\n';
        return 1;
    }
}
