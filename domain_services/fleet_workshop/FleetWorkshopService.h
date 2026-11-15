#pragma once
#include "dto/BaseApiResponse.h"
#include "utils/AuditUtil.h"
#include <drogon/drogon.h>
#include <string>

namespace business_desk::domain_services {

// Fleet & Workshop Management service (Mcguan CMMS + workshop diary ledger).
// One service class owns the entire bounded module across 4 implementation
// units: FleetWorkshopMaster.cc, FleetWorkshopOperations.cc,
// FleetWorkshopJobs.cc, and FleetWorkshopInternal.h.
class FleetWorkshopService {
public:
  // Executes a Fleet & Workshop operation.
  //   op: "<resource>.<action>" (e.g. "vehicles.list", "job-cards.issue-parts")
  //   id: primary resource UUID (optional)
  //   subId: nested resource UUID (e.g. lineId or milestoneId, optional)
  //   body: normalized JSON payload or query parameters
  //   page/size: 1-based pagination
  //   query: free-text filter
  //   unitId: accounting unit scope UUID (optional on tenant-wide lists)
  //   who: authenticated tenant/user identity from TenantJwtAuthFilter
  static drogon::Task<dto::BaseApiResponse>
  execute(std::string op, std::string id, std::string subId, Json::Value body,
          int page, int size, std::string query, std::string unitId,
          utils::AuditIdentity who);
};

} // namespace business_desk::domain_services
