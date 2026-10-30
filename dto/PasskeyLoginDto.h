//
// Created by Emmanuel Addo-Odame on 17/10/2026.
//

#ifndef BUSINESSDESKAPI_PASSKEYLOGINDTO_H
#define BUSINESSDESKAPI_PASSKEYLOGINDTO_H
#include <json/json.h>
#include <string>
namespace business_desk::dto {

  class PasskeyLoginDto {
public:
  PasskeyLoginDto() = default;
  explicit PasskeyLoginDto(const Json::Value &json) { fromJson(json); }

  void fromJson(const Json::Value &json);

  // Getters
  [[nodiscard]] const std::string &getCredentialId() const { return credential_id_; }
  [[nodiscard]] const std::string &getAccountId() const { return account_id_; }
  [[nodiscard]] const std::string &getAuthenticatorData() const {
    return authenticator_data_;
  }
  [[nodiscard]] const std::string &getClientDataJSON() const {
    return client_data_json_;
  }
  [[nodiscard]] const std::string &getSignature() const { return signature_; }
  [[nodiscard]] const std::string &getUserHandle() const {
    return user_handle_;
  }

  // Setters
  void setAccountId(const std::string &v) { account_id_ = v; }
  void setCredentialId(const std::string &v) { credential_id_ = v; }
  void setAuthenticatorData(const std::string &v) { authenticator_data_ = v; }
  void setClientDataJSON(const std::string &v) { client_data_json_ = v; }
  void setSignature(const std::string &v) { signature_ = v; }
  void setUserHandle(const std::string &v) { user_handle_ = v; }

private:
  std::string account_id_; // as tenant id
  std::string credential_id_;
  std::string authenticator_data_;
  std::string client_data_json_;
  std::string signature_;
  std::string user_handle_;
};


  inline void PasskeyLoginDto::fromJson(const Json::Value &json) {
  account_id_ = json.get("accountId", "").asString();
  if (json.isMember("id") && !json["id"].isNull()) {
    credential_id_ = json["id"].asString();
  } else if (json.isMember("credentialId") && !json["credentialId"].isNull()) {
    credential_id_ = json["credentialId"].asString();
  }

  if (json.isMember("response") && !json["response"].isNull()) {
    const auto &response = json["response"];
    if (response.isMember("authenticatorData") &&
        !response["authenticatorData"].isNull()) {
      authenticator_data_ = response["authenticatorData"].asString();
    }
    if (response.isMember("clientDataJSON") &&
        !response["clientDataJSON"].isNull()) {
      client_data_json_ = response["clientDataJSON"].asString();
    }
    if (response.isMember("signature") && !response["signature"].isNull()) {
      signature_ = response["signature"].asString();
    }
    if (response.isMember("userHandle") && !response["userHandle"].isNull()) {
      user_handle_ = response["userHandle"].asString();
    }
  } else {
    // Flat structure support just in case
    if (json.isMember("authenticatorData") &&
        !json["authenticatorData"].isNull()) {
      authenticator_data_ = json["authenticatorData"].asString();
    }
    if (json.isMember("clientDataJSON") && !json["clientDataJSON"].isNull()) {
      client_data_json_ = json["clientDataJSON"].asString();
    }
    if (json.isMember("signature") && !json["signature"].isNull()) {
      signature_ = json["signature"].asString();
    }
    if (json.isMember("userHandle") && !json["userHandle"].isNull()) {
      user_handle_ = json["userHandle"].asString();
    }
  }
}


  class SigninDto {

  public:
    SigninDto() = default;
    explicit SigninDto(const Json::Value& json) { fromJson(json); }

    void fromJson(const Json::Value& json);

    // Getters
    [[nodiscard]] const std::string& getAccountId() const { return accountId_; }
    [[nodiscard]] const std::string& getUsernameOrEmail() const { return usernameOrEmail_; }
    [[nodiscard]] const std::string& getPassword() const { return password_; }

    // Setters
    void setAccountId(const std::string& usernameOrEmail) { accountId_ = usernameOrEmail; }
    void setUsernameOrEmail(const std::string& usernameOrEmail) { usernameOrEmail_ = usernameOrEmail; }
    void setPassword(const std::string& password) { password_ = password; }

  private:
    std::string accountId_;
    std::string usernameOrEmail_;
    std::string password_;
  };

  inline void SigninDto::fromJson(const Json::Value& json) {

    if (json.isMember("accountId") && !json["accountId"].isNull()) {
      accountId_ = json["accountId"].asString();
    }

    if (json.isMember("usernameOrEmail") && !json["usernameOrEmail"].isNull()) {
      usernameOrEmail_ = json["usernameOrEmail"].asString();
    }

    if (json.isMember("password") && !json["password"].isNull()) {
      password_ = json["password"].asString();
    }

  }

}
#endif //BUSINESSDESKAPI_PASSKEYLOGINDTO_H
