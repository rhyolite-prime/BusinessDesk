#include "controllers/ledger_controller.h"

#include <json/json.h>

#include <string>
#include <utility>

namespace businessdesk::ledger
{
namespace
{
std::string jsonString(const Json::Value &object, const char *key)
{
    const auto &value = object[key];
    return value.isString() ? value.asString() : std::string{};
}

void addValidationFields(Json::Value &body, const JournalValidation &validation)
{
    body["valid"] = validation.valid;
    body["balanced"] = validation.balanced;
    body["debitTotal"] = validation.debitTotal;
    body["creditTotal"] = validation.creditTotal;
    Json::Value errors(Json::arrayValue);
    for (const auto &error : validation.errors)
    {
        errors.append(error);
    }
    body["errors"] = std::move(errors);
}
}  // namespace

void LedgerController::validateJournal(
    const drogon::HttpRequestPtr &request,
    std::function<void(const drogon::HttpResponsePtr &)> &&callback) const
{
    const auto payload = request->getJsonObject();
    if (!payload || !payload->isObject())
    {
        Json::Value body;
        body["error"] = "invalid_json";
        body["message"] = "A JSON object is required.";
        auto response = drogon::HttpResponse::newHttpJsonResponse(body);
        response->setStatusCode(drogon::k400BadRequest);
        callback(response);
        return;
    }

    JournalDraft draft;
    draft.batchDate = jsonString(*payload, "batchDate");
    draft.description = jsonString(*payload, "description");

    const auto &lines = (*payload)["lines"];
    if (lines.isArray())
    {
        draft.lines.reserve(lines.size());
        for (const auto &line : lines)
        {
            if (!line.isObject())
            {
                draft.lines.emplace_back();
                continue;
            }
            draft.lines.push_back({jsonString(line, "accountId"),
                                   jsonString(line, "description"),
                                   jsonString(line, "debit"),
                                   jsonString(line, "credit")});
        }
    }

    const JournalValidation validation = service_.validateJournalDraft(draft);
    Json::Value body;
    addValidationFields(body, validation);
    callback(drogon::HttpResponse::newHttpJsonResponse(body));
}
}  // namespace businessdesk::ledger
