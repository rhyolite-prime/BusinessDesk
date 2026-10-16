#pragma once

#include <drogon/HttpController.h>

#include <string>

#include "services/ledger/ledger_service.h"

namespace businessdesk::ledger
{
class LedgerController final : public drogon::HttpController<LedgerController>
{
  public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(LedgerController::validateJournal,
                  "/api/v1/ledger/journals/validate",
                  drogon::HttpMethod::Post);

    ADD_METHOD_TO(LedgerController::listAccountHeads,
                  "/api/v1/ledger/account-heads",
                  drogon::HttpMethod::Get);
    ADD_METHOD_TO(LedgerController::createAccountHead,
                  "/api/v1/ledger/account-heads",
                  drogon::HttpMethod::Post);
    ADD_METHOD_TO(LedgerController::getAccountHead,
                  "/api/v1/ledger/account-heads/{1}",
                  drogon::HttpMethod::Get);
    ADD_METHOD_TO(LedgerController::updateAccountHead,
                  "/api/v1/ledger/account-heads/{1}",
                  drogon::HttpMethod::Put);
    ADD_METHOD_TO(LedgerController::deleteAccountHead,
                  "/api/v1/ledger/account-heads/{1}",
                  drogon::HttpMethod::Delete);

    ADD_METHOD_TO(LedgerController::listAccountControls,
                  "/api/v1/ledger/account-controls",
                  drogon::HttpMethod::Get);
    ADD_METHOD_TO(LedgerController::createAccountControl,
                  "/api/v1/ledger/account-controls",
                  drogon::HttpMethod::Post);
    ADD_METHOD_TO(LedgerController::getAccountControl,
                  "/api/v1/ledger/account-controls/{1}",
                  drogon::HttpMethod::Get);
    ADD_METHOD_TO(LedgerController::updateAccountControl,
                  "/api/v1/ledger/account-controls/{1}",
                  drogon::HttpMethod::Put);
    ADD_METHOD_TO(LedgerController::deleteAccountControl,
                  "/api/v1/ledger/account-controls/{1}",
                  drogon::HttpMethod::Delete);

    ADD_METHOD_TO(LedgerController::listAccountDetails,
                  "/api/v1/ledger/accounts",
                  drogon::HttpMethod::Get);
    ADD_METHOD_TO(LedgerController::createAccountDetail,
                  "/api/v1/ledger/accounts",
                  drogon::HttpMethod::Post);
    ADD_METHOD_TO(LedgerController::getAccountDetail,
                  "/api/v1/ledger/accounts/{1}",
                  drogon::HttpMethod::Get);
    ADD_METHOD_TO(LedgerController::updateAccountDetail,
                  "/api/v1/ledger/accounts/{1}",
                  drogon::HttpMethod::Put);
    ADD_METHOD_TO(LedgerController::deleteAccountDetail,
                  "/api/v1/ledger/accounts/{1}",
                  drogon::HttpMethod::Delete);
    METHOD_LIST_END

    drogon::Task<drogon::HttpResponsePtr> validateJournal(drogon::HttpRequestPtr request) const;

    drogon::Task<drogon::HttpResponsePtr> listAccountHeads(drogon::HttpRequestPtr request) const;
    drogon::Task<drogon::HttpResponsePtr> createAccountHead(drogon::HttpRequestPtr request) const;
    drogon::Task<drogon::HttpResponsePtr> getAccountHead(drogon::HttpRequestPtr request,
                                                         std::string id) const;
    drogon::Task<drogon::HttpResponsePtr> updateAccountHead(drogon::HttpRequestPtr request,
                                                            std::string id) const;
    drogon::Task<drogon::HttpResponsePtr> deleteAccountHead(drogon::HttpRequestPtr request,
                                                            std::string id) const;

    drogon::Task<drogon::HttpResponsePtr> listAccountControls(drogon::HttpRequestPtr request) const;
    drogon::Task<drogon::HttpResponsePtr> createAccountControl(drogon::HttpRequestPtr request) const;
    drogon::Task<drogon::HttpResponsePtr> getAccountControl(drogon::HttpRequestPtr request,
                                                            std::string id) const;
    drogon::Task<drogon::HttpResponsePtr> updateAccountControl(drogon::HttpRequestPtr request,
                                                               std::string id) const;
    drogon::Task<drogon::HttpResponsePtr> deleteAccountControl(drogon::HttpRequestPtr request,
                                                               std::string id) const;

    drogon::Task<drogon::HttpResponsePtr> listAccountDetails(drogon::HttpRequestPtr request) const;
    drogon::Task<drogon::HttpResponsePtr> createAccountDetail(drogon::HttpRequestPtr request) const;
    drogon::Task<drogon::HttpResponsePtr> getAccountDetail(drogon::HttpRequestPtr request,
                                                           std::string id) const;
    drogon::Task<drogon::HttpResponsePtr> updateAccountDetail(drogon::HttpRequestPtr request,
                                                              std::string id) const;
    drogon::Task<drogon::HttpResponsePtr> deleteAccountDetail(drogon::HttpRequestPtr request,
                                                              std::string id) const;

  private:
    LedgerService service_;
};
}  // namespace businessdesk::ledger
