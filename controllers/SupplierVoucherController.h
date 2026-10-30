#pragma once
#include <drogon/HttpController.h>
class SupplierVoucherController
    : public drogon::HttpController<SupplierVoucherController> {
public:
  METHOD_LIST_BEGIN
  ADD_METHOD_TO(SupplierVoucherController::list, "/api/v1/ledger/vouchers",
                drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(SupplierVoucherController::get, "/api/v1/ledger/vouchers/{1}",
                drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(SupplierVoucherController::create, "/api/v1/ledger/vouchers",
                drogon::Post, "TenantJwtAuthFilter");
  ADD_METHOD_TO(SupplierVoucherController::update,
                "/api/v1/ledger/vouchers/{1}", drogon::Put,
                "TenantJwtAuthFilter");
  ADD_METHOD_TO(SupplierVoucherController::remove,
                "/api/v1/ledger/vouchers/{1}", drogon::Delete,
                "TenantJwtAuthFilter");
  ADD_METHOD_TO(SupplierVoucherController::preview,
                "/api/v1/ledger/vouchers/preview", drogon::Post,
                "TenantJwtAuthFilter");
  ADD_METHOD_TO(SupplierVoucherController::submit,
                "/api/v1/ledger/vouchers/{1}/submit", drogon::Post,
                "TenantJwtAuthFilter");
  ADD_METHOD_TO(SupplierVoucherController::approve,
                "/api/v1/ledger/vouchers/{1}/approve", drogon::Post,
                "TenantJwtAuthFilter");
  ADD_METHOD_TO(SupplierVoucherController::post,
                "/api/v1/ledger/vouchers/{1}/post", drogon::Post,
                "TenantJwtAuthFilter");
  METHOD_LIST_END
  drogon::Task<drogon::HttpResponsePtr> list(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> get(drogon::HttpRequestPtr req,
                                            std::string id);
  drogon::Task<drogon::HttpResponsePtr> create(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> update(drogon::HttpRequestPtr req,
                                               std::string id);
  drogon::Task<drogon::HttpResponsePtr> remove(drogon::HttpRequestPtr req,
                                               std::string id);
  drogon::Task<drogon::HttpResponsePtr> preview(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> submit(drogon::HttpRequestPtr req,
                                               std::string id);
  drogon::Task<drogon::HttpResponsePtr> approve(drogon::HttpRequestPtr req,
                                                std::string id);
  drogon::Task<drogon::HttpResponsePtr> post(drogon::HttpRequestPtr req,
                                             std::string id);
};
