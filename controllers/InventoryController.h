#pragma once
#include <drogon/HttpController.h>
class InventoryController : public drogon::HttpController<InventoryController> {
public:
 METHOD_LIST_BEGIN
 // Static segments before the wildcard resource routes.
 ADD_METHOD_TO(InventoryController::dashboard,"/api/v1/inventory/dashboard/summary",drogon::Get,"TenantJwtAuthFilter");
 ADD_METHOD_TO(InventoryController::nextNumber,"/api/v1/inventory/{1}/next-number",drogon::Get,"TenantJwtAuthFilter");
 ADD_METHOD_TO(InventoryController::itemCard,"/api/v1/inventory/items/{1}/card",drogon::Get,"TenantJwtAuthFilter");
 ADD_METHOD_TO(InventoryController::list,"/api/v1/inventory/{1}",drogon::Get,"TenantJwtAuthFilter");
 ADD_METHOD_TO(InventoryController::get,"/api/v1/inventory/{1}/{2}",drogon::Get,"TenantJwtAuthFilter");
 ADD_METHOD_TO(InventoryController::create,"/api/v1/inventory/{1}",drogon::Post,"TenantJwtAuthFilter");
 ADD_METHOD_TO(InventoryController::update,"/api/v1/inventory/{1}/{2}",drogon::Put,"TenantJwtAuthFilter");
 ADD_METHOD_TO(InventoryController::remove,"/api/v1/inventory/{1}/{2}",drogon::Delete,"TenantJwtAuthFilter");
 ADD_METHOD_TO(InventoryController::action,"/api/v1/inventory/{1}/{2}/{3}",drogon::Post,"TenantJwtAuthFilter");
 METHOD_LIST_END
 drogon::Task<drogon::HttpResponsePtr> dashboard(drogon::HttpRequestPtr req);
 drogon::Task<drogon::HttpResponsePtr> nextNumber(drogon::HttpRequestPtr req, std::string resource);
 drogon::Task<drogon::HttpResponsePtr> itemCard(drogon::HttpRequestPtr req, std::string id);
 drogon::Task<drogon::HttpResponsePtr> list(drogon::HttpRequestPtr req, std::string resource);
 drogon::Task<drogon::HttpResponsePtr> get(drogon::HttpRequestPtr req, std::string resource, std::string id);
 drogon::Task<drogon::HttpResponsePtr> create(drogon::HttpRequestPtr req, std::string resource);
 drogon::Task<drogon::HttpResponsePtr> update(drogon::HttpRequestPtr req, std::string resource, std::string id);
 drogon::Task<drogon::HttpResponsePtr> remove(drogon::HttpRequestPtr req, std::string resource, std::string id);
 drogon::Task<drogon::HttpResponsePtr> action(drogon::HttpRequestPtr req, std::string resource, std::string id, std::string action);
};
