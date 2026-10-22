#pragma once
// Whitelisted, client-editable employee fields; tenant/audit/version fields are
// server-owned.
namespace business_desk::domain_services::employee_fields {
struct Field {
  const char *key;
  const char *column;
  const char *kind;
  unsigned max;
  bool required;
};
inline constexpr Field fields[] = {
    {"employeeIdentifier", "employee_identifier", "text", 20, true},
    {"firstName", "first_name", "text", 100, true},
    {"otherName", "other_name", "text", 100, false},
    {"lastName", "last_name", "text", 100, true},
    {"employeePhoto", "employee_photo", "text", 350, false},
    {"title", "title", "text", 50, false},
    {"gender", "gender", "text", 10, false},
    {"status", "status", "int", 0, false},
    {"cityOrLocation", "city_or_location", "text", 100, false},
    {"residenceAddress", "residence_address", "text", 150, false},
    {"departmentId", "department_id", "uuid", 0, false},
    {"departmentName", "department_name", "text", 150, false},
    {"categoryId", "category_id", "uuid", 0, false},
    {"categoryName", "category_name", "text", 150, false},
    {"dateAppointed", "date_appointed", "date", 0, true},
    {"salaryGradeId", "salary_grade_id", "uuid", 0, false},
    {"salaryGradeName", "salary_grade_name", "text", 150, false},
    {"salaryNotchId", "salary_notch_id", "uuid", 0, false},
    {"salaryNotchName", "salary_notch_name", "text", 150, false},
    {"rankId", "rank_id", "uuid", 0, false},
    {"rankName", "rank_name", "text", 150, false},
    {"taxIdentificationNo", "tax_identification_no", "text", 20, false},
    {"dateOfBirth", "date_of_birth", "date", 0, true},
    {"personalEmail", "personal_email", "text", 100, false},
    {"maritalStatus", "marital_status", "text", 20, false},
    {"religion", "religion", "text", 100, false},
    {"nationality", "nationality", "text", 100, false},
    {"hometown", "hometown", "text", 100, false},
    {"primaryPhoneNumber", "primary_phone_number", "text", 20, false},
    {"secondaryPhoneNumber", "secondary_phone_number", "text", 20, false},
    {"companyEmail", "company_email", "text", 100, false},
    {"nationalIdentificationNo", "national_identification_no", "text", 20,
     false},
    {"nationalHealthInsuranceNo", "national_health_insurance_no", "text", 20,
     false},
    {"driverLicenseNo", "driver_license_no", "text", 20, false},
    {"driverLicenseIssueDate", "driver_license_issue_date", "date", 0, false},
    {"driverLicenseExpiryDate", "driver_license_expiry_date", "date", 0, false},
    {"identityType", "identity_type", "text", 50, false},
    {"identityNo", "identity_no", "text", 20, false},
    {"height", "height", "decimal", 0, false},
    {"weight", "weight", "decimal", 0, false},
    {"languages", "languages", "array", 0, false},
    {"interests", "interests", "array", 0, false},
    {"healthIssues", "health_issues", "array", 0, false},
    {"leaveDaysEntitled", "leave_days_entitled", "int", 0, false},
    {"medicalExpensesLimit", "medical_expenses_limit", "decimal", 0, false},
    {"userId", "user_id", "uuid", 0, false},
};
} // namespace business_desk::domain_services::employee_fields
