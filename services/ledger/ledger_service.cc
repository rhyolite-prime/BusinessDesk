#include "services/ledger/ledger_service.h"

#include <algorithm>
#include <cctype>
#include <string_view>
#include <utility>

namespace businessdesk::ledger
{
namespace
{
constexpr std::size_t kAmountScale = 6;
constexpr std::size_t kMaximumWholeDigits = 14;
constexpr std::size_t kMaximumJournalLines = 1000;

struct ParsedAmount
{
    bool valid{false};
    bool isZero{true};
    std::string scaledUnits{"0"};
};

std::string stripLeadingZeroes(std::string value)
{
    const auto firstNonZero = value.find_first_not_of('0');
    if (firstNonZero == std::string::npos)
    {
        return "0";
    }
    value.erase(0, firstNonZero);
    return value;
}

bool containsOnlyDigits(std::string_view value)
{
    return !value.empty() && std::all_of(value.begin(), value.end(), [](unsigned char character) {
               return std::isdigit(character) != 0;
           });
}

ParsedAmount parseAmount(const std::string &amount)
{
    if (amount.empty() || amount.size() > 64)
    {
        return {};
    }

    const auto decimalPoint = amount.find('.');
    if (decimalPoint != std::string::npos && amount.find('.', decimalPoint + 1) != std::string::npos)
    {
        return {};
    }

    const std::string_view wholePart = decimalPoint == std::string::npos
                                           ? std::string_view(amount)
                                           : std::string_view(amount).substr(0, decimalPoint);
    const std::string_view fractionPart = decimalPoint == std::string::npos
                                              ? std::string_view{}
                                              : std::string_view(amount).substr(decimalPoint + 1);

    if (!containsOnlyDigits(wholePart) ||
        (decimalPoint != std::string::npos && !containsOnlyDigits(fractionPart)) ||
        fractionPart.size() > kAmountScale)
    {
        return {};
    }

    const std::string normalizedWhole = stripLeadingZeroes(std::string(wholePart));
    if (normalizedWhole.size() > kMaximumWholeDigits)
    {
        return {};
    }

    std::string scaledUnits = normalizedWhole;
    scaledUnits.append(fractionPart);
    scaledUnits.append(kAmountScale - fractionPart.size(), '0');
    scaledUnits = stripLeadingZeroes(std::move(scaledUnits));

    return {true, scaledUnits == "0", std::move(scaledUnits)};
}

std::string addUnsignedIntegers(const std::string &left, const std::string &right)
{
    std::string reversed;
    reversed.reserve(std::max(left.size(), right.size()) + 1);

    std::size_t leftIndex = left.size();
    std::size_t rightIndex = right.size();
    unsigned int carry = 0;
    while (leftIndex > 0 || rightIndex > 0 || carry > 0)
    {
        unsigned int digit = carry;
        if (leftIndex > 0)
        {
            digit += static_cast<unsigned int>(left[--leftIndex] - '0');
        }
        if (rightIndex > 0)
        {
            digit += static_cast<unsigned int>(right[--rightIndex] - '0');
        }
        reversed.push_back(static_cast<char>('0' + digit % 10));
        carry = digit / 10;
    }

    std::reverse(reversed.begin(), reversed.end());
    return stripLeadingZeroes(std::move(reversed));
}

std::string formatAmount(const std::string &scaledUnits)
{
    const std::string padded = std::string(scaledUnits.size() <= kAmountScale
                                               ? kAmountScale + 1 - scaledUnits.size()
                                               : 0,
                                           '0') +
                               scaledUnits;
    const auto wholeLength = padded.size() - kAmountScale;
    const std::string whole = stripLeadingZeroes(padded.substr(0, wholeLength));
    const std::string fraction = padded.substr(wholeLength);
    return whole + "." + fraction;
}

bool isValidIsoDate(const std::string &date)
{
    if (date.size() != 10 || date[4] != '-' || date[7] != '-')
    {
        return false;
    }
    for (std::size_t index = 0; index < date.size(); ++index)
    {
        if (index != 4 && index != 7 && std::isdigit(static_cast<unsigned char>(date[index])) == 0)
        {
            return false;
        }
    }

    const int yearValue = std::stoi(date.substr(0, 4));
    const unsigned int monthValue = static_cast<unsigned int>(std::stoi(date.substr(5, 2)));
    const unsigned int dayValue = static_cast<unsigned int>(std::stoi(date.substr(8, 2)));
    if (yearValue < 1 || yearValue > 9999 || monthValue < 1 || monthValue > 12)
    {
        return false;
    }

    const bool isLeapYear = yearValue % 400 == 0 || (yearValue % 4 == 0 && yearValue % 100 != 0);
    const std::size_t daysInMonth[] = {31, isLeapYear ? 29U : 28U, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    return dayValue >= 1 && dayValue <= daysInMonth[monthValue - 1];
}

void appendAmountError(std::vector<std::string> &errors,
                       std::size_t lineNumber,
                       std::string_view fieldName)
{
    errors.emplace_back("Line " + std::to_string(lineNumber) + ": " + std::string(fieldName) +
                        " must be a non-negative decimal with at most 14 whole digits and 6 decimal places.");
}
}  // namespace

JournalValidation LedgerService::validateJournalDraft(const JournalDraft &draft) const
{
    JournalValidation result;
    std::string debitUnits{"0"};
    std::string creditUnits{"0"};

    if (!isValidIsoDate(draft.batchDate))
    {
        result.errors.emplace_back("Journal date must be a real calendar date in YYYY-MM-DD format.");
    }
    if (draft.description.empty() || draft.description.size() > 200)
    {
        result.errors.emplace_back("Journal description is required and must not exceed 200 characters.");
    }
    if (draft.lines.size() < 2)
    {
        result.errors.emplace_back("A journal draft must contain at least two lines.");
    }
    if (draft.lines.size() > kMaximumJournalLines)
    {
        result.errors.emplace_back("A journal draft cannot contain more than 1000 lines.");
    }

    const auto lineCount = std::min(draft.lines.size(), kMaximumJournalLines);
    for (std::size_t index = 0; index < lineCount; ++index)
    {
        const auto &line = draft.lines[index];
        const auto lineNumber = index + 1;
        if (line.accountId.empty() || line.accountId.size() > 80)
        {
            result.errors.emplace_back("Line " + std::to_string(lineNumber) +
                                       ": account is required and must not exceed 80 characters.");
        }
        if (line.description.size() > 300)
        {
            result.errors.emplace_back("Line " + std::to_string(lineNumber) +
                                       ": description must not exceed 300 characters.");
        }

        const ParsedAmount debit = parseAmount(line.debit);
        const ParsedAmount credit = parseAmount(line.credit);
        if (!debit.valid)
        {
            appendAmountError(result.errors, lineNumber, "debit");
        }
        if (!credit.valid)
        {
            appendAmountError(result.errors, lineNumber, "credit");
        }
        if (!debit.valid || !credit.valid)
        {
            continue;
        }

        if (!debit.isZero && !credit.isZero)
        {
            result.errors.emplace_back("Line " + std::to_string(lineNumber) +
                                       ": enter an amount on either debit or credit, not both.");
        }
        if (debit.isZero && credit.isZero)
        {
            result.errors.emplace_back("Line " + std::to_string(lineNumber) +
                                       ": either debit or credit must be greater than zero.");
        }

        debitUnits = addUnsignedIntegers(debitUnits, debit.scaledUnits);
        creditUnits = addUnsignedIntegers(creditUnits, credit.scaledUnits);
    }

    result.debitTotal = formatAmount(debitUnits);
    result.creditTotal = formatAmount(creditUnits);
    result.valid = result.errors.empty();
    result.balanced = result.valid && debitUnits == creditUnits;
    return result;
}

JournalValidation LedgerService::validateJournalForApproval(const JournalDraft &draft) const
{
    JournalValidation result = validateJournalDraft(draft);
    if (result.valid && !result.balanced)
    {
        result.errors.emplace_back("Journal debit and credit totals must be equal before approval.");
        result.valid = false;
    }
    return result;
}
}  // namespace businessdesk::ledger
