#pragma once
#include "dto/BaseApiResponse.h"
#include "utils/AuditUtil.h"
#include <drogon/drogon.h>
#include <drogon/orm/CoroMapper.h>
namespace business_desk::domain_services {
// Supply chain module service. op carries "<resource>.<action>":
//   requisitions.list|get|next-number|create|update|delete|submit|approve|
//                reject|cancel|close
//   orders.list|get|next-number|create|update|delete|submit|approve|reject|
//        send|cancel|close
//   receipts.list|get|next-number|create|update|delete|post|reverse|cancel
// Goods receipts land in stock through InventoryService::postStockDocument in
// the same transaction; reversals go through reverseStockDocument.
class SupplyChainService {
public:
  static drogon::Task<dto::BaseApiResponse>
  execute(std::string op, std::string id, Json::Value body, int page, int size,
          std::string query, std::string unitId, utils::AuditIdentity who);
};
} // namespace business_desk::domain_services
