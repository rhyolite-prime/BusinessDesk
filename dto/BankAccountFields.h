#pragma once
#include <array>
namespace business_desk::dto::bank_account {
struct Field {const char* name;const char* column;const char* type;int limit;};
inline constexpr std::array<Field,14> fields{{
 {"bankId","bank_id","uuid",0},{"bankBranchId","bank_branch_id","uuid",0},
 {"accountId","account_id","uuid",0},{"currencyId","currency_id","uuid",0},
 {"accountNumber","account_number","varchar(100)",100},{"accountType","account_type","varchar(50)",50},
 {"address","address","text",150},{"location","location","varchar(160)",150},
 {"contactPerson","contact_person","varchar(160)",130},{"contactNumber","contact_number","varchar(80)",20},
 {"chequeBookStart","cheque_book_start","varchar(80)",20},{"chequeBookEnd","cheque_book_end","varchar(80)",20},
 {"dateOpened","date_opened","date",0},{"isActive","is_active","boolean",0}
}};
}
