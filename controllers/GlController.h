#pragma once

#include <drogon/HttpController.h>

#include <string>

using namespace drogon;

class GlController : public drogon::HttpController<GlController>
{
  public:
    static constexpr const char *PREFIX = "/api/v1/ledger/";
    METHOD_LIST_BEGIN
    // JournalController owns authenticated journal CRUD/validation/posting.




    ADD_METHOD_TO(GlController::listBankAccounts, std::string(PREFIX) + "bank-accounts", drogon::HttpMethod::Get);
    ADD_METHOD_TO(GlController::createBankAccount, std::string(PREFIX) + "bank-accounts", drogon::HttpMethod::Post);
    ADD_METHOD_TO(GlController::updateBankAccount, std::string(PREFIX) + "bank-accounts/{1}", drogon::HttpMethod::Put);
    ADD_METHOD_TO(GlController::deleteBankAccount, std::string(PREFIX) + "bank-accounts/{1}", drogon::HttpMethod::Delete);

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
    drogon::Task<drogon::HttpResponsePtr> deleteAccountDetail(drogon::HttpRequestPtr request,std::string id);

    drogon::Task<drogon::HttpResponsePtr> listBankAccounts(drogon::HttpRequestPtr request);
    drogon::Task<drogon::HttpResponsePtr> createBankAccount(drogon::HttpRequestPtr request);
    drogon::Task<drogon::HttpResponsePtr> updateBankAccount(drogon::HttpRequestPtr request,std::string id);
    drogon::Task<drogon::HttpResponsePtr> deleteBankAccount(drogon::HttpRequestPtr request,std::string id);

    drogon::Task<drogon::HttpResponsePtr> listAccountingUnits(drogon::HttpRequestPtr request);
    drogon::Task<drogon::HttpResponsePtr> createAccountingUnit(drogon::HttpRequestPtr request);
    drogon::Task<drogon::HttpResponsePtr> updateAccountingUnit(drogon::HttpRequestPtr request,std::string id);
    drogon::Task<drogon::HttpResponsePtr> deleteAccountingUnit(drogon::HttpRequestPtr request,std::string id);
};
