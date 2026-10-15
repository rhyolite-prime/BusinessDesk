#pragma once

#include <drogon/HttpController.h>

#include <functional>

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
    METHOD_LIST_END

    void validateJournal(const drogon::HttpRequestPtr &request,
                         std::function<void(c   onst drogon::HttpResponsePtr &)> &&callback) const;

  private:
    LedgerService service_;
};
}  // namespace businessdesk::ledger
