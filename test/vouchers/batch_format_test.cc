#include "domain_services/gl/BatchNumberFormat.h"
#include <cassert>
#include <map>
#include <string>
#include <type_traits>

struct Field {
  std::string value;
  template <typename T> T as() const {
    if constexpr (std::is_same_v<T, int>) return std::stoi(value);
    else return value;
  }
};
struct Row : std::map<std::string, Field> {
  using std::map<std::string, Field>::map;
  using std::map<std::string, Field>::operator[];
  Field &operator[](const char *key) { return at(key); }
  const Field &operator[](const char *key) const { return at(key); }
};
int main() {
  Row row{{"prefix", {"PV-"}}, {"suffix", {"/26"}}, {"padding", {"4"}},
          {"format_pattern", {"{SUFFIX}:{PREFIX}{NO}"}}};
  using business_desk::domain_services::batchFormat;
  assert(batchFormat(row, 42) == "/26:PV-0042");
  row["prefix"].value = "{NO}";
  assert(batchFormat(row, 1) == "/26:{NO}0001");
  row["format_pattern"].value = "{NO}{NO}";
  try { batchFormat(row, 1); assert(false); } catch (const std::invalid_argument &) {}
  row["format_pattern"].value = "{PREFIX}{NO}";
  row["prefix"].value = std::string(40, 'x');
  try { batchFormat(row, 1); assert(false); } catch (const std::invalid_argument &) {}
}
