#pragma once
#include <drogon/HttpController.h>
class FinancialReportController : public drogon::HttpController<FinancialReportController> {
public:
 METHOD_LIST_BEGIN
 ADD_METHOD_TO(FinancialReportController::snapshot,"/api/v1/ledger/financial-reports",drogon::Get,"TenantJwtAuthFilter");
 ADD_METHOD_TO(FinancialReportController::mappings,"/api/v1/ledger/financial-reports/mappings",drogon::Put,"TenantJwtAuthFilter");
 METHOD_LIST_END
 drogon::Task<drogon::HttpResponsePtr> snapshot(drogon::HttpRequestPtr req);
 drogon::Task<drogon::HttpResponsePtr> mappings(drogon::HttpRequestPtr req);
};
