#include "utils/Totp.h"
#include "domain_services/users/UserService.h"
#include "domain_services/auth/TotpSql.h"
#include "filters/TenantJwtAuthFilter.h"
#include "Users.h"
#include "Tenants.h"
#include "Roles.h"
#include "UserGroups.h"
#include <bcrypt.h>
#include <jwt-cpp/jwt.h>
#include <map>
#include <chrono>
using namespace business_desk;
using namespace drogon_model::BusinessDesk;
using namespace drogon::orm;
extern void check(bool,const char*);
void checkTotpLogin() {
    namespace crypto=utils::totp;
    auto mustThrow=[](auto action) { try {action();return false;}catch(const std::exception &){return true;} };
    const auto secret=crypto::base32(std::vector<unsigned char>{'1','2','3','4','5','6','7','8','9','0','1','2','3','4','5','6','7','8','9','0'});
    for (const auto &[time,expected] : std::vector<std::pair<int64_t,std::string>>{{59,"287082"},{1111111109,"081804"},{1111111111,"050471"},{1234567890,"005924"},{2000000000,"279037"},{20000000000LL,"353130"}})
        check(crypto::code(secret,time/30)==expected,"RFC6238 SHA1 vectors modulo six digits");
    check(crypto::verify(secret,"287082",59)==1,"RFC6238 code verifies");
    check(crypto::verify(secret,"287082",89)==1,"one-step clock drift accepted");
    check(crypto::verify(secret,"287082",120)==-1,"outside clock tolerance rejected");
    check(crypto::verify(secret,"28x082",59)==-1 && crypto::verify(secret,"12345",59)==-1,"TOTP format validated");
    drogon::app().config["TOTP_KEY"] = std::string(64,'a');
    auto ciphertext=crypto::seal(secret,"a:u");
    check(crypto::open(ciphertext,"a:u")==secret,"encrypted secret roundtrip");
    check(crypto::seal(secret,"a:u")!=ciphertext,"encryption uses random nonce");
    check(mustThrow([&]{crypto::open(ciphertext,"b:u");}),"GCM binds secret to tenant and user");
    ciphertext.back()=ciphertext.back()=='a'?'b':'a';
    check(mustThrow([&]{crypto::open(ciphertext,"a:u");}),"GCM detects ciphertext tampering");
    drogon::app().config.removeMember("TOTP_KEY");
    check(mustThrow([&]{crypto::seal(secret,"a:u");}),"missing key fails closed");
    for (const auto &invalid : std::vector<Json::Value>{Json::nullValue, "", "short", std::string(64, 'z'), 123, true, Json::Value(Json::arrayValue), Json::Value(Json::objectValue)}) {
        drogon::app().config["TOTP_KEY"] = invalid;
        check(mustThrow([&]{crypto::encryptionKey();}), "invalid custom-config TOTP key fails closed");
    }
    drogon::app().config["TOTP_KEY"] = std::string(64, 'A');
    check(crypto::encryptionKey() == std::vector<unsigned char>(32, 0xaa), "custom-config hex key decoded correctly");
    drogon::app().config.removeMember("TOTP_KEY");

    CoroMapper<Users>::rows.clear(); CoroMapper<Tenants>::rows.clear(); CoroMapper<Roles>::rows.clear(); CoroMapper<UserGroups>::rows.clear();
    CoroMapper<Users> users(0); CoroMapper<Tenants> tenants(0);
    Users user; user.setId("totp-user"); user.setTenantId("totp-tenant"); user.setUsername("admin"); user.setEmail("admin@example.com");
    user.setIsHostAdminUser(false); user.setIsActive(true); user.setIsLockedOut(false); user.setIsDeleted(false); user.setRoles("[]"); user.setUserGroups("[]");
    user.setPasswordHash(bcrypt::generateHash("real-password",4)); users.insert(user).get();
    Tenants tenant; tenant.setId("totp-tenant"); tenant.setTenancyName("acme"); tenant.setName("Acme"); tenant.setIsActive(true); tenant.setIsDeleted(false); tenant.setRequireTwoFactorAuth(false); tenants.insert(tenant).get();
    auto &cfg=drogon::app().config["JwtBearer"]; cfg["JwtSecurityKey"]="totp-tests-only"; cfg["JwtIssuer"]="issuer"; cfg["JwtAudience"]="audience"; cfg["JwtExpirationTime"]=3600;
    dto::SigninDto login; login.setAccountId("acme"); login.setUsernameOrEmail("admin@example.com"); login.setPassword("real-password");
    domain_services::UserService service;
    auto direct=service.validateTenantUserCredentials(login).get();
    check(direct.success && direct.result["token"].isString() && !direct.result["requiresTwoFactorAuth"].asBool(),"no-2FA tenant receives JWT directly");
    auto filterAccepts=[&](const std::string &token){auto req=std::make_shared<drogon::HttpRequest>();req->authorization="Bearer "+token;bool allowed=false;TenantJwtAuthFilter{}.doFilter(req,[](auto &){},[&]{allowed=true;});return allowed;};
    check(filterAccepts(direct.result["token"].asString()),"non-MFA token accepted when policy disabled");
    tenant.setRequireTwoFactorAuth(true); tenants.update(tenant).get();
    check(!filterAccepts(direct.result["token"].asString()),"existing password-only JWT denied when tenant enables MFA");
    check(!service.validateTenantUserCredentials(login).get().success,"MFA tenant cannot login without encryption key");
    drogon::app().config["TOTP_KEY"] = std::string(64,'a');

    struct Challenge {std::string encrypted,password;bool enrolling,consumed=false,expired=false;int attempts=0;};
    std::map<std::string,Challenge> challenges;
    std::map<std::string,int> rate;
    std::string credential;
    int64_t lastCounter=-1;
    bool failDb=false;
    drogon::app().db->execute=[&](const std::string &sql,const std::vector<Json::Value> &params)->drogon::TestResult {
        if(failDb)throw DrogonDbException("private-sensitive-database-error");
        Json::Value row;
        if(sql==domain_services::totp_sql::rate){row["attempts"]=++rate[params[1].asString()];return {{row}};}
        if(sql.find("SELECT encrypted_secret FROM auth_totp_credentials")==0){if(credential.empty())return {};row["encrypted_secret"]=credential;return {{row}};}
        if(sql.find("INSERT INTO auth_totp_challenges")==0){challenges[params[0].asString()]={params[3].asString(),params[5].asString(),params[4].asBool()};return {};}
        if(sql==domain_services::totp_sql::attempt){auto found=challenges.find(params[0].asString());if(found==challenges.end()||found->second.consumed||found->second.expired||found->second.attempts>=5)return {};auto &c=found->second;++c.attempts;row["user_id"]=user.getValueOfId();row["tenant_id"]=tenant.getValueOfId();row["encrypted_secret"]=c.encrypted;row["enrolling"]=c.enrolling;return {{row}};}
        if(sql==domain_services::totp_sql::complete){auto &c=challenges.at(params[0].asString());auto live=users.findByPrimaryKey(user.getValueOfId()).get();auto t=tenants.findByPrimaryKey(tenant.getValueOfId()).get();
            if(c.consumed||c.expired||!live.getValueOfIsActive()||live.getValueOfIsLockedOut()||live.getValueOfIsDeleted()||!t.getValueOfIsActive()||t.getValueOfIsDeleted()||!t.getValueOfRequireTwoFactorAuth()||crypto::hash(live.getValueOfPasswordHash())!=c.password)return {};
            c.consumed=true; auto counter=params[1].asInt64();if((!credential.empty()&&credential!=c.encrypted)||lastCounter>=counter)return {};credential=c.encrypted;lastCounter=counter;row["user_id"]=user.getValueOfId();row["tenant_id"]=tenant.getValueOfId();return {{row}};}
        throw std::runtime_error("Unexpected SQL in TOTP test");
    };
    auto begin=[&]{rate.clear();auto result=service.validateTenantUserCredentials(login).get();check(result.success&&result.result["requiresTwoFactorAuth"].asBool()&&!result.result.isMember("token"),"MFA credentials yield challenge, never JWT");return result.result;};
    auto first=begin();
    check(first["enrollmentRequired"].asBool()&&first["secret"].asString().size()==32,"first login offers base32 enrollment secret");
    auto &c=challenges.at(crypto::hash(first["challengeId"].asString()));
    check(c.encrypted.find(first["secret"].asString())==std::string::npos,"challenge stores encrypted secret only");
    check(challenges.count(first["challengeId"].asString())==0,"database stores hashed challenge, not bearer challenge");
    check(!service.verifyTenantSecondFactor(first["challengeId"].asString(),"bad").get().success&&credential.empty(),"bad code cannot enroll or mint token");
    const auto now=std::chrono::duration_cast<std::chrono::seconds>(std::chrono::system_clock::now().time_since_epoch()).count();
    auto current=crypto::code(first["secret"].asString(),now/30);
    auto verified=service.verifyTenantSecondFactor(first["challengeId"].asString(),current).get();
    check(verified.success&&verified.result["token"].isString(),"valid scanned authenticator code completes enrollment and JWT login");
    check(jwt::decode(verified.result["token"].asString()).get_payload_claim("mfa").as_boolean(),"JWT carries server-verified MFA evidence");
    check(filterAccepts(verified.result["token"].asString()),"MFA JWT passes tenant policy enforcement");
    check(!service.verifyTenantSecondFactor(first["challengeId"].asString(),current).get().success,"challenge is single use");
    auto second=begin();check(!second["enrollmentRequired"].asBool()&&!second.isMember("secret"),"enrolled users never receive existing secret/QR");
    check(!service.verifyTenantSecondFactor(second["challengeId"].asString(),current).get().success,"TOTP counter cannot be replayed across challenges");
    auto expired=begin();challenges.at(crypto::hash(expired["challengeId"].asString())).expired=true;
    check(!service.verifyTenantSecondFactor(expired["challengeId"].asString(),current).get().success,"expired challenge denied");
    auto attempts=begin();for(int i=0;i<5;++i)check(!service.verifyTenantSecondFactor(attempts["challengeId"].asString(),"invalid").get().success,"wrong code denied and counted");
    lastCounter=-1;
    check(!service.verifyTenantSecondFactor(attempts["challengeId"].asString(),current).get().success,"five failed challenge attempts exhaust challenge");
    auto limited=begin();rate["verify"]=10;
    check(!service.verifyTenantSecondFactor(limited["challengeId"].asString(),current).get().success,"per-user limit spans challenges");
    auto locked=begin();user.setIsLockedOut(true);users.update(user).get();
    check(!service.verifyTenantSecondFactor(locked["challengeId"].asString(),current).get().success,"lockout between password and code blocks JWT");
    user.setIsLockedOut(false);users.update(user).get();
    auto changed=begin();user.setPasswordHash(bcrypt::generateHash("changed",4));users.update(user).get();
    check(!service.verifyTenantSecondFactor(changed["challengeId"].asString(),current).get().success,"password change invalidates pending challenge");
    failDb=true;auto failure=service.verifyTenantSecondFactor(changed["challengeId"].asString(),current).get();
    check(!failure.success&&!failure.result.isMember("token")&&failure.toJson().toStyledString().find("private-sensitive")==std::string::npos,"DB failure is closed and sanitized");
    drogon::app().db->execute={};drogon::app().config.removeMember("TOTP_KEY");
}
