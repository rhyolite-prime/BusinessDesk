#include "services/ledger/ledger_service.h"

#include <iostream>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

namespace
{
using businessdesk::dto::AccountControlInput;
using businessdesk::dto::AccountDetailInput;
using businessdesk::dto::AccountHeadInput;
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

        const std::string groupId = "41e5df34-3b77-4c50-90a3-d8c22df6d1a2";
        const std::string controlId = "4f33008b-7b54-4df3-9ce2-7a3e39f67a13";
        const AccountHeadInput validHead{"Current assets", std::nullopt, 0, 10, true};
        expect(service.validateAccountHeadInput(validHead).empty(),
               "A valid account head should pass pure validation.");
        const AccountHeadInput invalidHead{"   ", std::string("not-a-uuid"), 9, -1, true};
        expect(service.validateAccountHeadInput(invalidHead).size() == 4,
               "Empty names, invalid parents/types, and negative sort orders should be rejected.");

        const AccountControlInput validControl{groupId, std::nullopt, "Cash", 1000, 1099, true};
        expect(service.validateAccountControlInput(validControl).empty(),
               "A valid control range should pass pure validation.");
        const AccountControlInput invalidControl{groupId, std::nullopt, "Broken range", 1100, 1000, true};
        expect(!service.validateAccountControlInput(invalidControl).empty(),
               "An inverted control range must be rejected.");

        const AccountDetailInput validDetail{controlId,
                                             groupId,
                                             "1001",
                                             "Petty cash",
                                             "active",
                                             std::nullopt,
                                             true,
                                             false};
        expect(service.validateAccountDetailInput(validDetail).empty(),
               "A numeric posting account with valid IDs and status should pass pure validation.");
        auto invalidDetail = validDetail;
        invalidDetail.accountNumber = "10A1";
        invalidDetail.status = "posted";
        expect(service.validateAccountDetailInput(invalidDetail).size() == 2,
               "Non-numeric account numbers and unsupported statuses should be rejected.");

        std::cout << "LedgerService validation tests passed.\n";
        return 0;
    }
    catch (const std::exception &error)
    {
        std::cerr << "LedgerService validation test failed: " << error.what() << '\n';
        return 1;
    }
}
