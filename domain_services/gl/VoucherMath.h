#pragma once
#include <algorithm>
#include <json/json.h>
#include <map>
#include <regex>
#include <stdexcept>
namespace business_desk::voucher_math {
using I = __int128_t;
inline I integer(const char *s) {
  I n = 0;
  for (; *s; s++)
    n = n * 10 + (*s - '0');
  return n;
}
inline std::string str(I n) {
  if (!n)
    return "0";
  std::string s;
  while (n) {
    s.push_back('0' + n % 10);
    n /= 10;
  }
  std::reverse(s.begin(), s.end());
  return s;
}
inline I parse(const Json::Value &v, int digits = 6) {
  if (!v.isString() ||
      !std::regex_match(
          v.asString(),
          std::regex(digits == 10
                         ? R"(^(0|[1-9][0-9]{0,9})(\.[0-9]{1,10})?$)"
                         : R"(^(0|[1-9][0-9]{0,13})(\.[0-9]{1,6})?$)")))
    throw std::invalid_argument(
        "Amounts/rates must be bounded non-negative decimal strings.");
  auto s = v.asString();
  auto p = s.find('.');
  auto whole = p == std::string::npos ? s : s.substr(0, p),
       frac = p == std::string::npos ? "" : s.substr(p + 1);
  frac.append(digits - frac.size(), '0');
  I n = 0;
  for (char c : whole + frac)
    n = n * 10 + (c - '0');
  return n;
}
inline I round(I n, I d) {
  if (n < 0 || d <= 0)
    throw std::invalid_argument("Invalid financial rounding.");
  return (n + d / 2) / d;
}
inline I cents(I n) { return round(n, I(10000)) * 10000; }
inline std::string text(I n) {
  if (n < 0 || n > integer("99999999999999999999"))
    throw std::invalid_argument("Amount outside numeric(20,6).");
  auto w = str(n / 1000000), f = str(n % 1000000);
  return w + "." + std::string(6 - f.size(), '0') + f;
}
inline Json::Value defaults() {
  Json::Value t;
  for (auto k : {"nhil", "getfund", "vat", "cst", "covid", "incomeWithholding",
                 "vatWithholding"}) {
    t[k]["enabled"] = false;
    t[k]["rate"] = "0";
  }
  t["incomeWithholding"]["accountId"] = Json::nullValue;
  t["vatWithholding"]["accountId"] = Json::nullValue;
  return t;
}
inline Json::Value calculate(const Json::Value &body) {
  const auto &taxes = body["taxes"];
  auto expected = defaults();
  if (!taxes.isObject() || taxes.size() != expected.size())
    throw std::invalid_argument("Supply every supported tax configuration.");
  I totalRate = 0;
  for (auto k : expected.getMemberNames()) {
    auto t = taxes[k];
    if (!t.isObject() || !t["enabled"].isBool() ||
        t.size() != expected[k].size())
      throw std::invalid_argument("Invalid tax configuration.");
    for (auto f : t.getMemberNames())
      if (!expected[k].isMember(f))
        throw std::invalid_argument("Unexpected tax field.");
    I r = parse(t["rate"]);
    if (r > 100000000 || (t["enabled"].asBool() && r == 0))
      throw std::invalid_argument("Enabled tax rates must be greater than zero "
                                  "and at most 100 percent.");
    if (t["enabled"].asBool() && k != "incomeWithholding" &&
        k != "vatWithholding")
      totalRate += r;
  }
  if (taxes["cst"]["enabled"].asBool() && taxes["covid"]["enabled"].asBool())
    throw std::invalid_argument("CST and COVID levy are mutually exclusive.");
  Json::Value out;
  out["lines"] = Json::arrayValue;
  out["retentions"] = Json::arrayValue;
  I gross = 0, base = 0, deduct = 0;
  std::map<std::string, I> sums;
  for (const auto &line : body["lines"]) {
    I amount = parse(
        line[body["multiCurrency"].asBool() ? "foreignAmount" : "localAmount"]);
    if (body["multiCurrency"].asBool()) {
      I fx = parse(body["exchangeRate"], 10);
      if (fx == 0 || amount > integer("99999999999999999999") *
                                  integer("10000000000") / fx)
        throw std::invalid_argument(
            "Converted amount exceeds ledger precision.");
      amount = round(amount * fx, integer("10000000000"));
    }
    amount = cents(amount);
    if (amount == 0)
      throw std::invalid_argument(
          "Every voucher row must remain positive after cent rounding.");
    gross += amount;
    Json::Value row;
    row["gross"] = text(amount);
    bool flagged = line["isWithhold"].asBool();
    I denominator = I(100000000) + totalRate;
    row["base"] =
        text(flagged ? round(amount * 100000000, denominator * 10000) * 10000
                     : amount);
    if (flagged)
      base += parse(row["base"]);
    for (auto k : expected.getMemberNames()) {
      I v = 0;
      if (flagged && taxes[k]["enabled"].asBool())
        v = round(amount * parse(taxes[k]["rate"]), denominator * 10000) *
            10000;
      row[k] = text(v);
      sums[k] += v;
      if (k == "incomeWithholding" || k == "vatWithholding")
        deduct += v;
    }
    out["lines"].append(row);
  }
  I retained = 0;
  for (const auto &r : body["retentions"]) {
    I v = parse(r["value"]);
    if (r["isPercentage"].asBool()) {
      if (v > 100000000)
        throw std::invalid_argument("Retention percentage cannot exceed 100.");
      v = round(gross * v, integer("1000000000000")) * 10000;
    } else
      v = cents(v);
    if (v == 0)
      throw std::invalid_argument("Retention must be positive after rounding.");
    retained += v;
    out["retentions"].append(text(v));
  }
  if (deduct + retained > gross)
    throw std::invalid_argument("Deductions exceed the gross payment.");
  out["gross"] = text(gross);
  out["base"] = text(base);
  out["retained"] = text(retained);
  out["net"] = text(gross - deduct - retained);
  for (auto &[k, v] : sums)
    out[k] = text(v);
  out["rounding"] = "legacy-cent-half-up";
  return out;
}
} // namespace business_desk::voucher_math
