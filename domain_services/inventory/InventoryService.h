#pragma once
#include "dto/BaseApiResponse.h"
#include "utils/AuditUtil.h"
#include <drogon/drogon.h>
#include <drogon/orm/CoroMapper.h>
namespace business_desk::domain_services {
// Inventory (Stock & Warehouse) module service. One service class owns the
// whole module: catalog masters, locations, stock documents and the valuation
// close. Implementation is split across InventoryService.cc (masters, read
// models, valuation) and InventoryStock.cc (document lifecycle + posting
// engine); both belong to this single class.
class InventoryService {
public:
  // Masters and read models. op carries "<resource>.<action>":
  //   categories|uoms|items|item-uom-conversions|item-suppliers|warehouses|
  //   bin-locations|item-warehouses|batches|serials with list|options|get|
  //   create|update|delete (as applicable), plus items.next-number,
  //   items.card, balances.list, ledger.list, snapshots.list|get|capture|post,
  //   closes.list|get|prepare|close, dashboard.summary.
  static drogon::Task<dto::BaseApiResponse>
  execute(std::string op, std::string id, Json::Value body, int page, int size,
          std::string query, std::string unitId, utils::AuditIdentity who);
  // Stock documents: documents.list|get|create|update|delete|next-number|
  // submit|approve|post|cancel|reverse.
  static drogon::Task<dto::BaseApiResponse>
  documents(std::string op, std::string id, Json::Value body, int page,
            int size, std::string query, std::string unitId,
            utils::AuditIdentity who);
  // Versioned cross-module contract: create and post a stock document inside
  // the caller's transaction. The supply-chain module uses it to land purchase
  // receipts into stock; the caller owns commit/rollback and must merge the
  // returned documentId/documentNumber/journalBatchId into its own records.
  static drogon::Task<dto::BaseApiResponse>
  postStockDocument(drogon::orm::DbClientPtr transaction, Json::Value payload,
                    utils::AuditIdentity who);
  // Internal reversal of a posted stock document inside the caller's
  // transaction (used by the supply-chain module to back receipts out).
  static drogon::Task<dto::BaseApiResponse>
  reverseStockDocument(drogon::orm::DbClientPtr transaction,
                       std::string documentId, std::string reason,
                       utils::AuditIdentity who);
};
} // namespace business_desk::domain_services
