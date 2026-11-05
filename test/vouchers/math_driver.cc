#include "domain_services/gl/VoucherMath.h"
#include <iostream>
int main() {
  std::string line;
  while (std::getline(std::cin, line)) {
    Json::Value b, out;
    Json::Reader reader;
    try {
      if (!reader.parse(line, b))
        throw std::invalid_argument("JSON");
      out["result"] = business_desk::voucher_math::calculate(b);
    } catch (const std::exception &) {
      out["error"] = true;
    }
    std::cout << Json::FastWriter().write(out);
  }
}
