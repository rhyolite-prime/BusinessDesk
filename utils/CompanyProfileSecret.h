#pragma once
#include "utils/Totp.h"
#include <algorithm>
#include <cctype>
#include <memory>
namespace business_desk::utils::company_profile_secret {
// A separate CustomConfig key keeps SMTP credentials isolated from TOTP secrets.
inline std::vector<unsigned char> key(){
 const auto& config=drogon::app().getCustomConfig();
 if(!config["COMPANY_PROFILE_SMTP_KEY"].isString()||config["COMPANY_PROFILE_SMTP_KEY"].asString().size()!=64)throw std::runtime_error("SMTP encryption key is not configured");
 auto bytes=totp::unhex(config["COMPANY_PROFILE_SMTP_KEY"].asString());if(bytes.size()!=32)throw std::runtime_error("Invalid SMTP key");return bytes;
}
inline std::string aad(std::string tenant){std::transform(tenant.begin(),tenant.end(),tenant.begin(),[](unsigned char c){return std::tolower(c);});return "company-profile/smtp/v1/"+tenant;}
inline std::string seal(const std::string& secret,const std::string& tenant){
 const auto k=key(),nonce=totp::random(12);const auto identity=aad(tenant);
 std::unique_ptr<EVP_CIPHER_CTX,decltype(&EVP_CIPHER_CTX_free)> ctx(EVP_CIPHER_CTX_new(),EVP_CIPHER_CTX_free);
 std::vector<unsigned char> output(secret.size()+16);std::array<unsigned char,16>tag{};int len=0,total=0;
 if(!ctx||EVP_EncryptInit_ex(ctx.get(),EVP_aes_256_gcm(),nullptr,k.data(),nonce.data())!=1||EVP_EncryptUpdate(ctx.get(),nullptr,&len,reinterpret_cast<const unsigned char*>(identity.data()),identity.size())!=1||EVP_EncryptUpdate(ctx.get(),output.data(),&len,reinterpret_cast<const unsigned char*>(secret.data()),secret.size())!=1)throw std::runtime_error("SMTP encryption failed");
 total=len;if(EVP_EncryptFinal_ex(ctx.get(),output.data()+total,&len)!=1||EVP_CIPHER_CTX_ctrl(ctx.get(),EVP_CTRL_GCM_GET_TAG,16,tag.data())!=1)throw std::runtime_error("SMTP encryption failed");total+=len;
 return "v1:"+totp::hex(nonce.data(),nonce.size())+totp::hex(tag.data(),tag.size())+totp::hex(output.data(),total);
}
// For a future server-side mail sender only. Never expose this through read APIs.
inline std::string open(const std::string& encrypted,const std::string& tenant){
 if(!encrypted.starts_with("v1:"))throw std::runtime_error("Invalid SMTP ciphertext");
 const auto k=key(),bytes=totp::unhex(encrypted.substr(3));if(bytes.size()<29||bytes.size()>1052)throw std::runtime_error("Invalid SMTP ciphertext");const auto identity=aad(tenant);
 std::unique_ptr<EVP_CIPHER_CTX,decltype(&EVP_CIPHER_CTX_free)> ctx(EVP_CIPHER_CTX_new(),EVP_CIPHER_CTX_free);std::vector<unsigned char> output(bytes.size());int len=0,total=0;
 if(!ctx||EVP_DecryptInit_ex(ctx.get(),EVP_aes_256_gcm(),nullptr,k.data(),bytes.data())!=1||EVP_DecryptUpdate(ctx.get(),nullptr,&len,reinterpret_cast<const unsigned char*>(identity.data()),identity.size())!=1||EVP_DecryptUpdate(ctx.get(),output.data(),&len,bytes.data()+28,bytes.size()-28)!=1||EVP_CIPHER_CTX_ctrl(ctx.get(),EVP_CTRL_GCM_SET_TAG,16,const_cast<unsigned char*>(bytes.data()+12))!=1)throw std::runtime_error("SMTP decryption failed");total=len;
 if(EVP_DecryptFinal_ex(ctx.get(),output.data()+total,&len)!=1)throw std::runtime_error("SMTP decryption failed");total+=len;return std::string(reinterpret_cast<const char*>(output.data()),total);
}
}
