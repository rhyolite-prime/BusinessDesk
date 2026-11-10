#pragma once
#include <cstdint>
#include <stdexcept>
#include <string>

namespace business_desk::domain_services {
// Expand tokens in the pattern only: prefix/suffix are literal values.
template <typename Row>
inline std::string batchFormat(const Row& settings, int64_t counter){
 auto digits=std::to_string(counter);const int padding=settings["padding"].template as<int>();
 if(padding<0||padding>18)throw std::invalid_argument("Invalid numbering padding");
 if(digits.size()<static_cast<size_t>(padding))digits.insert(0,padding-digits.size(),'0');
 const auto pattern=settings["format_pattern"].template as<std::string>();std::string result;int numberTokens=0;
 for(size_t i=0;i<pattern.size();) {
  if(pattern.compare(i,4,"{NO}")==0){result+=digits;i+=4;++numberTokens;}
  else if(pattern.compare(i,8,"{PREFIX}")==0){result+=settings["prefix"].template as<std::string>();i+=8;}
  else if(pattern.compare(i,8,"{SUFFIX}")==0){result+=settings["suffix"].template as<std::string>();i+=8;}
  else {if(pattern[i]=='{'||pattern[i]=='}')throw std::invalid_argument("Invalid numbering token");result+=pattern[i++];}
 }
 if(numberTokens!=1||result.empty()||result.size()>40)throw std::invalid_argument("Batch number must fit 40 bytes and include NO exactly once");
 return result;
}
} // namespace business_desk::domain_services
