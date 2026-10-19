#pragma once
// RFC 6238 SHA-1/6-digit/30-second TOTP, with AES-256-GCM secret storage.
#include <openssl/evp.h>
#include <openssl/hmac.h>
#include <openssl/rand.h>
#include <openssl/crypto.h>
#include <array>
#include <cstdint>
#include <drogon/HttpAppFramework.h>
#include <iomanip>
#include <memory>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

namespace business_desk::utils::totp {
inline std::string hex(const unsigned char *data, size_t length) {
    static constexpr char digits[] = "0123456789abcdef";
    std::string out; out.reserve(length * 2);
    for (size_t i = 0; i < length; ++i) { out += digits[data[i] >> 4]; out += digits[data[i] & 15]; }
    return out;
}
inline std::vector<unsigned char> unhex(const std::string &value) {
    if (value.size() % 2) throw std::runtime_error("Invalid encrypted secret");
    std::vector<unsigned char> out;
    auto digit = [](char c) { if (c >= '0' && c <= '9') return c-'0'; if (c >= 'a' && c <= 'f') return c-'a'+10; if (c >= 'A' && c <= 'F') return c-'A'+10; throw std::runtime_error("Invalid hex data"); };
    for (size_t i=0; i<value.size(); i+=2) out.push_back((digit(value[i])<<4) | digit(value[i+1]));
    return out;
}
inline std::vector<unsigned char> random(size_t count) {
    std::vector<unsigned char> out(count);
    if (RAND_bytes(out.data(), static_cast<int>(out.size())) != 1) throw std::runtime_error("Random generator unavailable");
    return out;
}
inline std::string randomToken() { const auto bytes = random(32); return hex(bytes.data(), bytes.size()); }
inline std::string hash(const std::string &value) {
    unsigned char digest[EVP_MAX_MD_SIZE]; unsigned int length=0;
    if (EVP_Digest(value.data(),value.size(),digest,&length,EVP_sha256(),nullptr)!=1) throw std::runtime_error("Hash unavailable");
    return hex(digest,length);
}
inline std::string base32(const std::vector<unsigned char> &bytes) {
    const char *alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    std::string result; unsigned int bits=0, value=0;
    for (auto byte: bytes) { value=(value<<8)|byte; bits+=8; while(bits>=5) { result+=alphabet[(value>>(bits-5))&31]; bits-=5; } value &= (1u<<bits)-1; }
    if(bits) result+=alphabet[(value<<(5-bits))&31];
    return result;
}
inline std::vector<unsigned char> decode32(const std::string &secret) {
    const std::string alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    std::vector<unsigned char> out; unsigned int bits=0, value=0;
    for (auto c: secret) { auto index=alphabet.find(c); if(index==std::string::npos) throw std::runtime_error("Invalid TOTP secret"); value=(value<<5)|static_cast<unsigned>(index); bits+=5; if(bits>=8) { out.push_back((value>>(bits-8))&255); bits-=8; } value &= (1u<<bits)-1; }
    return out;
}
inline std::string code(const std::string &secret, int64_t counter) {
    auto key=decode32(secret); std::array<unsigned char,8> bytes{};
    auto value=static_cast<uint64_t>(counter);
    for(int i=7;i>=0;--i){bytes[i]=value&255;value>>=8;}
    unsigned char digest[EVP_MAX_MD_SIZE]; unsigned int length=0;
    if(!HMAC(EVP_sha1(),key.data(),static_cast<int>(key.size()),bytes.data(),bytes.size(),digest,&length)) throw std::runtime_error("TOTP unavailable");
    auto offset=digest[length-1]&15;
    unsigned int number=((digest[offset]&127)<<24)|(digest[offset+1]<<16)|(digest[offset+2]<<8)|digest[offset+3];
    std::ostringstream result; result<<std::setw(6)<<std::setfill('0')<<number%1000000; return result.str();
}
inline int64_t verify(const std::string &secret, const std::string &input, int64_t nowSeconds) {
    if(input.size()!=6 || input.find_first_not_of("0123456789")!=std::string::npos) return -1;
    // Prefer the newest matching counter; persistent last_counter blocks replay.
    for(int drift=1;drift>=-1;--drift){auto counter=nowSeconds/30+drift;if(counter<0)continue;auto expected=code(secret,counter);if(CRYPTO_memcmp(expected.data(),input.data(),6)==0)return counter;}
    return -1;
}
inline std::vector<unsigned char> encryptionKey() {
    const auto &config = drogon::app().getCustomConfig();
    if (!config.isObject() || !config["TOTP_KEY"].isString())
        throw std::runtime_error("custom_config.TOTP_KEY is not configured");
    const auto setting = config["TOTP_KEY"].asString();
    if (setting.size() != 64)
        throw std::runtime_error("custom_config.TOTP_KEY must contain 64 hexadecimal characters");
    auto key = unhex(setting);
    if (key.size() != 32) throw std::runtime_error("Invalid TOTP encryption key");
    return key;
}
inline std::string seal(const std::string &secret, const std::string &identity) {
    const auto key=encryptionKey(), nonce=random(12);
    std::unique_ptr<EVP_CIPHER_CTX,decltype(&EVP_CIPHER_CTX_free)> ctx(EVP_CIPHER_CTX_new(),EVP_CIPHER_CTX_free);
    std::vector<unsigned char> output(secret.size()+16); std::array<unsigned char,16> tag{}; int length=0,total=0;
    if(!ctx || EVP_EncryptInit_ex(ctx.get(),EVP_aes_256_gcm(),nullptr,key.data(),nonce.data())!=1 ||
       EVP_EncryptUpdate(ctx.get(),nullptr,&length,reinterpret_cast<const unsigned char*>(identity.data()),static_cast<int>(identity.size()))!=1 ||
       EVP_EncryptUpdate(ctx.get(),output.data(),&length,reinterpret_cast<const unsigned char*>(secret.data()),static_cast<int>(secret.size()))!=1) throw std::runtime_error("Secret encryption failed");
    total=length;
    if(EVP_EncryptFinal_ex(ctx.get(),output.data()+total,&length)!=1 || EVP_CIPHER_CTX_ctrl(ctx.get(),EVP_CTRL_GCM_GET_TAG,16,tag.data())!=1) throw std::runtime_error("Secret encryption failed");
    total+=length;
    return hex(nonce.data(),nonce.size())+hex(tag.data(),tag.size())+hex(output.data(),total);
}
inline std::string open(const std::string &encrypted, const std::string &identity) {
    const auto key=encryptionKey(), bytes=unhex(encrypted);
    if(bytes.size()<29 || bytes.size()>256) throw std::runtime_error("Invalid encrypted secret");
    std::unique_ptr<EVP_CIPHER_CTX,decltype(&EVP_CIPHER_CTX_free)> ctx(EVP_CIPHER_CTX_new(),EVP_CIPHER_CTX_free);
    std::vector<unsigned char> output(bytes.size()); int length=0,total=0;
    if(!ctx || EVP_DecryptInit_ex(ctx.get(),EVP_aes_256_gcm(),nullptr,key.data(),bytes.data())!=1 ||
       EVP_DecryptUpdate(ctx.get(),nullptr,&length,reinterpret_cast<const unsigned char*>(identity.data()),static_cast<int>(identity.size()))!=1 ||
       EVP_DecryptUpdate(ctx.get(),output.data(),&length,bytes.data()+28,static_cast<int>(bytes.size()-28))!=1 ||
       EVP_CIPHER_CTX_ctrl(ctx.get(),EVP_CTRL_GCM_SET_TAG,16,const_cast<unsigned char*>(bytes.data()+12))!=1) throw std::runtime_error("Secret decryption failed");
    total=length;
    if(EVP_DecryptFinal_ex(ctx.get(),output.data()+total,&length)!=1) throw std::runtime_error("Secret decryption failed");
    total+=length; return std::string(reinterpret_cast<const char*>(output.data()),total);
}
}
