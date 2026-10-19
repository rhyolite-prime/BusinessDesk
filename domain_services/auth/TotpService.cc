#include "TotpService.h"
#include "TotpSql.h"
#include "utils/Totp.h"
#include "constants/ErrorCodes.h"
#include <chrono>
namespace business_desk::domain_services {
namespace {
drogon::Task<bool> allow(std::string userId, std::string purpose) {
    auto rows = co_await drogon::app().getDbClient()->execSqlCoro(totp_sql::rate,userId,purpose);
    co_return !rows.empty() && rows[0]["attempts"].as<int>() <= 10;
}
}
drogon::Task<dto::BaseApiResponse> TotpService::begin(std::string userId, std::string tenantId, std::string accountLabel, std::string passwordHash) {
    namespace crypto = utils::totp;
    crypto::encryptionKey(); // Missing key must never silently disable 2FA.
    dto::BaseApiResponse result;
    if (!(co_await allow(userId,"begin"))) {
        result.error["code"] = constants::ERR_AUTH_INVALID_CREDENTIALS;
        result.error["message"] = "Too many authentication attempts. Try again later.";
        co_return result;
    }
    auto db = drogon::app().getDbClient();
    const auto rows = co_await db->execSqlCoro(
        "SELECT encrypted_secret FROM auth_totp_credentials WHERE user_id=$1::uuid AND tenant_id=$2::uuid", userId,tenantId);
    const bool enrolling=rows.empty();
    const auto secret=enrolling ? crypto::base32(crypto::random(20)) : std::string{};
    const auto encrypted=enrolling ? crypto::seal(secret,tenantId+":"+userId) : rows[0]["encrypted_secret"].as<std::string>();
    const auto token=crypto::randomToken();
    co_await db->execSqlCoro(
        "INSERT INTO auth_totp_challenges (token_hash,user_id,tenant_id,encrypted_secret,enrolling,password_fingerprint) VALUES ($1,$2::uuid,$3::uuid,$4,$5,$6)",
        crypto::hash(token),userId,tenantId,encrypted,enrolling,crypto::hash(passwordHash));
    result.success=true;
    result.result["requiresTwoFactorAuth"]=true;
    result.result["challengeId"]=token;
    result.result["expiresIn"]=300;
    result.result["enrollmentRequired"]=enrolling;
    if(enrolling) {
        result.result["secret"]=secret;
        result.result["issuer"]="BusinessDesk";
        result.result["accountLabel"]=accountLabel;
    }
    // No JWT, session, or current code exists in this response.
    co_return result;
}
drogon::Task<VerifiedTotpIdentity> TotpService::verify(std::string challenge, std::string code) {
    namespace crypto = utils::totp;
    if(challenge.size()!=64 || challenge.find_first_not_of("0123456789abcdef")!=std::string::npos)
        co_return VerifiedTotpIdentity{};
    auto db=drogon::app().getDbClient();
    auto rows=co_await db->execSqlCoro(totp_sql::attempt,crypto::hash(challenge));
    if(rows.empty()) co_return VerifiedTotpIdentity{};
    const auto userId=rows[0]["user_id"].as<std::string>();
    const auto tenantId=rows[0]["tenant_id"].as<std::string>();
    if(!(co_await allow(userId,"verify"))) co_return VerifiedTotpIdentity{};
    const auto secret=crypto::open(rows[0]["encrypted_secret"].as<std::string>(),tenantId+":"+userId);
    const auto now=std::chrono::duration_cast<std::chrono::seconds>(std::chrono::system_clock::now().time_since_epoch()).count();
    const auto counter=crypto::verify(secret,code,now);
    if(counter<0) co_return VerifiedTotpIdentity{};
    rows=co_await db->execSqlCoro(totp_sql::complete,crypto::hash(challenge),counter);
    if(rows.empty()) co_return VerifiedTotpIdentity{};
    co_return VerifiedTotpIdentity{rows[0]["user_id"].as<std::string>(),rows[0]["tenant_id"].as<std::string>()};
}
}
