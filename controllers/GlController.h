#pragma once

#include <drogon/HttpController.h>

#include <string>

using namespace drogon;

class GlController : public drogon::HttpController<GlController>
{
  public:
    static constexpr const char *PREFIX = "/api/v1/ledger/";
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(GlController::validateJournal, std::string(PREFIX) + "journals/validate", drogon::HttpMethod::Post);

    ADD_METHOD_TO(GlController::listAccountHeads, std::string(PREFIX) + "account-heads",drogon::HttpMethod::Get);
    ADD_METHOD_TO(GlController::createAccountHead, std::string(PREFIX) + "account-heads",drogon::HttpMethod::Post);
    ADD_METHOD_TO(GlController::getAccountHead, std::string(PREFIX) + "account-heads/{1}", drogon::HttpMethod::Get);
    ADD_METHOD_TO(GlController::updateAccountHead, std::string(PREFIX) + "account-heads/{1}",drogon::HttpMethod::Put);
    ADD_METHOD_TO(GlController::deleteAccountHead, std::string(PREFIX) + "account-heads/{1}",drogon::HttpMethod::Delete);

    ADD_METHOD_TO(GlController::listAccountControls, std::string(PREFIX) + "account-controls",drogon::HttpMethod::Get);
    ADD_METHOD_TO(GlController::createAccountControl,std::string(PREFIX) + "account-controls",drogon::HttpMethod::Post);
    ADD_METHOD_TO(GlController::getAccountControl, std::string(PREFIX) + "account-controls/{1}", drogon::HttpMethod::Get);
    ADD_METHOD_TO(GlController::updateAccountControl, std::string(PREFIX) + "account-controls/{1}",drogon::HttpMethod::Put);
    ADD_METHOD_TO(GlController::deleteAccountControl, std::string(PREFIX) + "account-controls/{1}", drogon::HttpMethod::Delete);

    ADD_METHOD_TO(GlController::listAccountDetails, std::string(PREFIX) + "accounts", drogon::HttpMethod::Get);
    ADD_METHOD_TO(GlController::createAccountDetail, std::string(PREFIX) + "accounts",drogon::HttpMethod::Post);
    ADD_METHOD_TO(GlController::getAccountDetail, std::string(PREFIX) + "accounts/{1}",drogon::HttpMethod::Get);
    ADD_METHOD_TO(GlController::updateAccountDetail, std::string(PREFIX) + "accounts/{1}",drogon::HttpMethod::Put);
    ADD_METHOD_TO(GlController::deleteAccountDetail, std::string(PREFIX) + "accounts/{1}",drogon::HttpMethod::Delete);
    METHOD_LIST_END

    drogon::Task<drogon::HttpResponsePtr> validateJournal(drogon::HttpRequestPtr request);

    drogon::Task<drogon::HttpResponsePtr> listAccountHeads(drogon::HttpRequestPtr request);
    drogon::Task<drogon::HttpResponsePtr> createAccountHead(drogon::HttpRequestPtr request);
    drogon::Task<drogon::HttpResponsePtr> getAccountHead(drogon::HttpRequestPtr request,std::string id);
    drogon::Task<drogon::HttpResponsePtr> updateAccountHead(drogon::HttpRequestPtr request,std::string id);
    drogon::Task<drogon::HttpResponsePtr> deleteAccountHead(drogon::HttpRequestPtr request,std::string id);

    drogon::Task<drogon::HttpResponsePtr> listAccountControls(drogon::HttpRequestPtr request);
    drogon::Task<drogon::HttpResponsePtr> createAccountControl(drogon::HttpRequestPtr request);
    drogon::Task<drogon::HttpResponsePtr> getAccountControl(drogon::HttpRequestPtr request, std::string id);
    drogon::Task<drogon::HttpResponsePtr> updateAccountControl(drogon::HttpRequestPtr request, std::string id);
    drogon::Task<drogon::HttpResponsePtr> deleteAccountControl(drogon::HttpRequestPtr request, std::string id);

    drogon::Task<drogon::HttpResponsePtr> listAccountDetails(drogon::HttpRequestPtr request);
    drogon::Task<drogon::HttpResponsePtr> createAccountDetail(drogon::HttpRequestPtr request);
    drogon::Task<drogon::HttpResponsePtr> getAccountDetail(drogon::HttpRequestPtr request, std::string id);
    drogon::Task<drogon::HttpResponsePtr> updateAccountDetail(drogon::HttpRequestPtr request,std::string id);
    drogon::Task<drogon::HttpResponsePtr> deleteAccountDetail(drogon::HttpRequestPtr request, std::string id);
};

