#pragma once
#include <drogon/HttpController.h>
class SupplierController : public drogon::HttpController<SupplierController> {
public:
  METHOD_LIST_BEGIN
  ADD_METHOD_TO(SupplierController::groupList, "/api/v1/shared/supplier-groups",
                drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(SupplierController::groupGet,
                "/api/v1/shared/supplier-groups/{1}", drogon::Get,
                "TenantJwtAuthFilter");
  ADD_METHOD_TO(SupplierController::groupCreate,
                "/api/v1/shared/supplier-groups", drogon::Post,
                "TenantJwtAuthFilter");
  ADD_METHOD_TO(SupplierController::groupUpdate,
                "/api/v1/shared/supplier-groups/{1}", drogon::Put,
                "TenantJwtAuthFilter");
  ADD_METHOD_TO(SupplierController::groupRemove,
                "/api/v1/shared/supplier-groups/{1}", drogon::Delete,
                "TenantJwtAuthFilter");
  ADD_METHOD_TO(SupplierController::supplierList, "/api/v1/shared/suppliers",
                drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(SupplierController::supplierGet, "/api/v1/shared/suppliers/{1}",
                drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(SupplierController::supplierCreate, "/api/v1/shared/suppliers",
                drogon::Post, "TenantJwtAuthFilter");
  ADD_METHOD_TO(SupplierController::supplierUpdate,
                "/api/v1/shared/suppliers/{1}", drogon::Put,
                "TenantJwtAuthFilter");
  ADD_METHOD_TO(SupplierController::supplierRemove,
                "/api/v1/shared/suppliers/{1}", drogon::Delete,
                "TenantJwtAuthFilter");
  ADD_METHOD_TO(SupplierController::supplierOptions,
                "/api/v1/shared/suppliers/options", drogon::Get,
                "TenantJwtAuthFilter");
  METHOD_LIST_END
  drogon::Task<drogon::HttpResponsePtr> groupList(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> groupGet(drogon::HttpRequestPtr req,
                                                 std::string id);
  drogon::Task<drogon::HttpResponsePtr> groupCreate(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> groupUpdate(drogon::HttpRequestPtr req,
                                                    std::string id);
  drogon::Task<drogon::HttpResponsePtr> groupRemove(drogon::HttpRequestPtr req,
                                                    std::string id);
  drogon::Task<drogon::HttpResponsePtr>
  supplierList(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> supplierGet(drogon::HttpRequestPtr req,
                                                    std::string id);
  drogon::Task<drogon::HttpResponsePtr>
  supplierCreate(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr>
  supplierUpdate(drogon::HttpRequestPtr req, std::string id);
  drogon::Task<drogon::HttpResponsePtr>
  supplierRemove(drogon::HttpRequestPtr req, std::string id);
  drogon::Task<drogon::HttpResponsePtr>
  supplierOptions(drogon::HttpRequestPtr req);
};
