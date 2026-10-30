export const companyProfileFields = [
  { key: 'displayDecimals', label: 'Monetary display decimal places', kind: 'i', max: 6, group: 'display' },
  {
    "key": "companyName",
    "label": "Company name",
    "kind": "s",
    "max": 200,
    "group": "company"
  },
  {
    "key": "countryName",
    "label": "Country name",
    "kind": "s",
    "max": 100,
    "group": "company"
  },
  {
    "key": "cityName",
    "label": "City name",
    "kind": "s",
    "max": 160,
    "group": "company"
  },
  {
    "key": "phoneNo",
    "label": "Phone number",
    "kind": "s",
    "max": 50,
    "group": "company"
  },
  {
    "key": "address",
    "label": "Address",
    "kind": "s",
    "max": 1000,
    "group": "company"
  },
  {
    "key": "companyTin",
    "label": "Company TIN",
    "kind": "s",
    "max": 100,
    "group": "company"
  },
  {
    "key": "email",
    "label": "Email",
    "kind": "s",
    "max": 254,
    "group": "company"
  },
  {
    "key": "firstMonthOfFiscalYear",
    "label": "First month of fiscal year",
    "kind": "i",
    "max": 12,
    "group": "company"
  },
  {
    "key": "vatNo",
    "label": "VAT number",
    "kind": "s",
    "max": 100,
    "group": "company"
  },
  {
    "key": "employerSocialSecurityNo",
    "label": "Employer social security no",
    "kind": "s",
    "max": 100,
    "group": "social"
  },
  {
    "key": "paySocialSecurityFund",
    "label": "Pay social security fund",
    "kind": "b",
    "max": 0,
    "group": "social"
  },
  {
    "key": "socialSecurityFundEmployeeRate",
    "label": "Social security fund employee rate",
    "kind": "r",
    "max": 100,
    "group": "social"
  },
  {
    "key": "socialSecurityFundEmployerRate",
    "label": "Social security fund employer rate",
    "kind": "r",
    "max": 100,
    "group": "social"
  },
  {
    "key": "payProvidentFund",
    "label": "Pay provident fund",
    "kind": "b",
    "max": 0,
    "group": "provident"
  },
  {
    "key": "providentFundEmployeeRate",
    "label": "Provident fund employee rate",
    "kind": "r",
    "max": 100,
    "group": "provident"
  },
  {
    "key": "providentFundEmployerRate",
    "label": "Provident fund employer rate",
    "kind": "r",
    "max": 100,
    "group": "provident"
  },
  {
    "key": "providentFundTreatAsSocialSecurityFund",
    "label": "Provident fund treat as social security fund",
    "kind": "b",
    "max": 0,
    "group": "provident"
  },
  {
    "key": "providentFundTaxEmployerPortion",
    "label": "Provident fund tax employer portion",
    "kind": "b",
    "max": 0,
    "group": "provident"
  },
  {
    "key": "paySecondProvidentOrOthers",
    "label": "Pay second provident or others",
    "kind": "b",
    "max": 0,
    "group": "second"
  },
  {
    "key": "secondProvidentEmployeeRate",
    "label": "Second provident employee rate",
    "kind": "r",
    "max": 100,
    "group": "second"
  },
  {
    "key": "secondProvidentEmployerRate",
    "label": "Second provident employer rate",
    "kind": "r",
    "max": 100,
    "group": "second"
  },
  {
    "key": "treatSecondProvidentAsSsf",
    "label": "Treat second fund as social security",
    "kind": "b",
    "max": 0,
    "group": "second"
  },
  {
    "key": "secondProvidentTaxEmployerPortion",
    "label": "Second provident tax employer portion",
    "kind": "b",
    "max": 0,
    "group": "second"
  },
  {
    "key": "overtimePercentageOnBasicSalary",
    "label": "Overtime percentage on basic salary",
    "kind": "b",
    "max": 0,
    "group": "overtime"
  },
  {
    "key": "overtimePercentageOnDailyWage",
    "label": "Overtime percentage on daily wage",
    "kind": "b",
    "max": 0,
    "group": "overtime"
  },
  {
    "key": "defaultCurrencyId",
    "label": "Default currency",
    "kind": "u",
    "max": 0,
    "group": "company"
  },
  {
    "key": "mailHostName",
    "label": "Mail host name",
    "kind": "s",
    "max": 255,
    "group": "mail"
  },
  {
    "key": "isSslEnabled",
    "label": "Use SSL/TLS",
    "kind": "b",
    "max": 0,
    "group": "mail"
  },
  {
    "key": "portNumber",
    "label": "Port number",
    "kind": "i",
    "max": 65535,
    "group": "mail"
  },
  {
    "key": "primaryEmailAddress",
    "label": "Primary email address",
    "kind": "s",
    "max": 254,
    "group": "mail"
  },
  {
    "key": "isTaxLeviesInclusive",
    "label": "Tax levies inclusive",
    "kind": "b",
    "max": 0,
    "group": "rules"
  },
  {
    "key": "approveInvoiceBeforePayment",
    "label": "Approve invoice before payment",
    "kind": "b",
    "max": 0,
    "group": "rules"
  },
  {
    "key": "companyLogoUrl",
    "label": "Company logo",
    "kind": "s",
    "max": 349551,
    "group": "company"
  },
  {
    "key": "enforceOu",
    "label": "Enforce organization unit",
    "kind": "b",
    "max": 0,
    "group": "rules"
  }
] as const
export type ProfileKey = typeof companyProfileFields[number]["key"]
export type ProfileForm = Record<ProfileKey, string | number | boolean | null>
export function emptyCompanyProfile(): ProfileForm {
 return Object.fromEntries(companyProfileFields.map(f => [f.key, f.kind === "b" ? false : f.kind === "u" ? null : f.key === "displayDecimals" ? 2 : f.key === "firstMonthOfFiscalYear" ? 1 : f.kind === "i" || f.kind === "r" ? 0 : ""])) as ProfileForm
}
