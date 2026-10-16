#include "services/ledger/ledger_service.h"

#include <algorithm>
#include <charconv>
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

std::string_view trimAscii(std::string_view value)
{
    while (!value.empty() && std::isspace(static_cast<unsigned char>(value.front())) != 0)
    {
        value.remove_prefix(1);
    }
    while (!value.empty() && std::isspace(static_cast<unsigned char>(value.back())) != 0)
    {
        value.remove_suffix(1);
    }
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

bool isNumericAccountNumber(std::string_view value)
{
    if (value.empty() || value.size() > 80)
    {
        return false;
    }
    for (const unsigned char character : value)
    {
        if (std::isdigit(character) == 0)
        {
            return false;
        }
    }
    std::int32_t parsed{};
    const auto conversion = std::from_chars(value.data(), value.data() + value.size(), parsed);
    return conversion.ec == std::errc{} && conversion.ptr == value.data() + value.size();
}

std::string lowerAscii(std::string value)
{
    std::transform(value.begin(), value.end(), value.begin(), [](unsigned char character) {
        return static_cast<char>(std::tolower(character));
    });
    return value;
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

std::vector<std::string> LedgerService::validateAccountHeadInput(
    const dto::AccountHeadInput &input) const
{
    std::vector<std::string> errors;
    const auto name = trimAscii(input.name);
    if (name.empty())
    {
        errors.emplace_back("Account head name is required.");
    }
    else if (name.size() > 160)
    {
        errors.emplace_back("Account head name must not exceed 160 characters.");
    }
    if (input.parentGroupId && !isUuid(*input.parentGroupId))
    {
        errors.emplace_back("Parent account head ID must be a UUID.");
    }
    if (input.standardAccountType < 0 || input.standardAccountType > 4)
    {
        errors.emplace_back("Standard account type must be Asset, Liability, Equity, Revenue, or Expense.");
    }
    if (input.sortOrder < 0)
    {
        errors.emplace_back("Sort order must be zero or greater.");
    }
    return errors;
}

std::vector<std::string> LedgerService::validateAccountControlInput(
    const dto::AccountControlInput &input) const
{
    std::vector<std::string> errors;
    const auto name = trimAscii(input.accountHeaderName);
    if (!isUuid(input.accountGroupId))
    {
        errors.emplace_back("Account group ID must be a UUID.");
    }
    if (input.parentAccountHeaderId && !isUuid(*input.parentAccountHeaderId))
    {
        errors.emplace_back("Parent control header ID must be a UUID.");
    }
    if (name.empty())
    {
        errors.emplace_back("Control header name is required.");
    }
    else if (name.size() > 160)
    {
        errors.emplace_back("Control header name must not exceed 160 characters.");
    }
    if (input.minAccount < 0 || input.maxAccount < input.minAccount)
    {
        errors.emplace_back("Account number range must be non-negative and the maximum must not be below the minimum.");
    }
    return errors;
}

std::vector<std::string> LedgerService::validateAccountDetailInput(
    const dto::AccountDetailInput &input) const
{
    std::vector<std::string> errors;
    const auto accountNumber = trimAscii(input.accountNumber);
    const auto accountName = trimAscii(input.accountName);
    if (!isUuid(input.accountHeaderId))
    {
        errors.emplace_back("Control header ID must be a UUID.");
    }
    if (input.accountGroupId && !isUuid(*input.accountGroupId))
    {
        errors.emplace_back("Account group ID must be a UUID when supplied.");
    }
    if (!isNumericAccountNumber(accountNumber))
    {
        errors.emplace_back("Account number must contain digits only and fit in a signed 32-bit integer.");
    }
    if (accountName.empty())
    {
        errors.emplace_back("Account name is required.");
    }
    else if (accountName.size() > 200)
    {
        errors.emplace_back("Account name must not exceed 200 characters.");
    }
    const auto normalizedStatus = lowerAscii(std::string(trimAscii(input.status)));
    if (normalizedStatus != "active" && normalizedStatus != "inactive")
    {
        errors.emplace_back("Account status must be either active or inactive.");
    }
    if (input.currencyId && !isUuid(*input.currencyId))
    {
        errors.emplace_back("Currency ID must be a UUID when supplied.");
    }
    return errors;
}
}  // namespace businessdesk::ledger
