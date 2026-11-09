#include "InventoryService.h"
#include "InventoryInternal.h"
#include "utils/TransactionUtil.h"
#include <optional>
#include <unordered_map>
#include <optional>
namespace business_desk::domain_services {
namespace {
using namespace inventory_internal;

// Table-driven master definition: everything the generic runner needs to read,
// validate, write and delete one catalog resource. Writes go through
// jsonb_populate_record, so every field validated above binds by column name.
struct MasterSpec {
  const char *table;
  const char *alias;
  const char *label;
  std::vector<Field> fields;
  std::string from;              // FROM + joins, leading space included
  std::string labels;            // extra jsonb pairs: 'parentName',p.name
  std::string optionsProjection; // jsonb_build_object('id',.., ...)
  std::string search;            // boolean SQL fragment using $2
  std::string orderBy;
  const char *unitColumn = nullptr; // optional accounting-unit filter column
  bool allowDelete = true;
  bool hasActive = false; // options restrict to is_active rows
  std::set<std::string> enums = {};
  const char *enumKey = nullptr;
};
bool oneOf(const std::string &s, const std::set<std::string> &allowed) {
  return allowed.count(s) != 0;
}
std::string projection(const MasterSpec &spec) {
  std::string expr = "jsonb_build_object('id'," + std::string(spec.alias) +
                     ".id,'version'," + spec.alias + ".version";
  int count = 2;
  for (const auto &f : spec.fields) {
    if (++count % 18 == 0)
      expr += ")||jsonb_build_object(";
    else
      expr += ",";
    expr += "'" + std::string(f.key) + "'," + spec.alias + "." + f.column;
    if (std::string(f.kind) == "decimal" || std::string(f.kind) == "rate" ||
        std::string(f.kind) == "factor")
      expr += "::text";
  }
  return expr + ")";
}
const std::unordered_map<std::string, MasterSpec> &specs() {
  static const std::unordered_map<std::string, MasterSpec> all = {
      {"categories",
       {"inv_item_categories", "c", "Category",
        {{"code", "code", "text", true, 40},
         {"name", "name", "text", true, 200},
         {"parentId", "parent_id", "uuid"},
         {"isActive", "is_active", "boolean"}},
        " FROM inv_item_categories c LEFT JOIN inv_item_categories p ON "
        "p.tenant_id=c.tenant_id AND p.id=c.parent_id AND p.is_deleted=false",
        "'parentName',p.name,'itemCount',(SELECT count(*) FROM inv_items i "
        "WHERE i.tenant_id=c.tenant_id AND i.item_category_id=c.id AND "
        "i.is_deleted=false)",
        "jsonb_build_object('id',c.id,'code',c.code,'name',c.name)",
        "(strpos(lower(c.code||' '||c.name),lower($2))>0)",
        "lower(c.code),c.id", nullptr, true, true}},
      {"uoms",
       {"inv_units_of_measure", "u", "Unit of measure",
        {{"code", "code", "text", true, 20},
         {"name", "name", "text", true, 80},
         {"uomType", "uom_type", "text", true, 20},
         {"decimalPlaces", "decimal_places", "integer"},
         {"isActive", "is_active", "boolean"}},
        " FROM inv_units_of_measure u", "",
        "jsonb_build_object('id',u.id,'code',u.code,'name',u.name,'uomType',u.uom_type,'decimalPlaces',u.decimal_places)",
        "(strpos(lower(u.code||' '||u.name),lower($2))>0)",
        "lower(u.code),u.id", nullptr, true, true,
        {"quantity", "weight", "volume", "length", "area", "time"},
        "uomType"}},
      {"warehouses",
       {"inv_warehouses", "w", "Warehouse",
        {{"code", "code", "text", true, 40},
         {"name", "name", "text", true, 200},
         {"warehouseType", "warehouse_type", "text", true, 20},
         {"accountingUnitId", "accounting_unit_id", "uuid", true},
         {"address", "address", "text", false, 1000},
         {"contactPerson", "contact_person", "text", false, 160},
         {"phoneNo", "phone_no", "text", false, 50},
         {"email", "email", "text", false, 254},
         {"allowsNegativeStock", "allows_negative_stock", "boolean"},
         {"isActive", "is_active", "boolean"}},
        " FROM inv_warehouses w LEFT JOIN core_accounting_units a ON "
        "a.tenant_id=w.tenant_id AND a.id=w.accounting_unit_id AND a.is_deleted=false",
        "'accountingUnitCode',a.code,'accountingUnitName',a.name",
        "jsonb_build_object('id',w.id,'code',w.code,'name',w.name,'warehouseType',w.warehouse_type,'accountingUnitId',w.accounting_unit_id)",
        "(strpos(lower(w.code||' '||w.name),lower($2))>0)",
        "lower(w.code),w.id", "w.accounting_unit_id", true, true,
        {"warehouse", "store", "van", "consignment", "bonded", "virtual"},
        "warehouseType"}},
      {"bin-locations",
       {"inv_bin_locations", "b", "Bin location",
        {{"warehouseId", "warehouse_id", "uuid", true},
         {"code", "code", "text", true, 40},
         {"zone", "zone", "text", false, 40},
         {"description", "description", "text", false, 500},
         {"capacity", "capacity", "decimal"},
         {"isActive", "is_active", "boolean"}},
        " FROM inv_bin_locations b LEFT JOIN inv_warehouses w ON "
        "w.tenant_id=b.tenant_id AND w.id=b.warehouse_id AND w.is_deleted=false",
        "'warehouseName',w.name",
        "jsonb_build_object('id',b.id,'code',b.code,'zone',b.zone,'warehouseId',b.warehouse_id)",
        "(strpos(lower(b.code||' '||b.zone),lower($2))>0)",
        "lower(b.code),b.id", nullptr, true, true}},
      {"item-warehouses",
       {"inv_item_warehouses", "iw", "Item location planning",
        {{"itemId", "item_id", "uuid", true},
         {"warehouseId", "warehouse_id", "uuid", true},
         {"defaultBinId", "default_bin_id", "uuid"},
         {"reorderPoint", "reorder_point", "decimal"},
         {"minStockLevel", "min_stock_level", "decimal"},
         {"maxStockLevel", "max_stock_level", "decimal"},
         {"reorderQuantity", "reorder_quantity", "decimal"},
         {"safetyStock", "safety_stock", "decimal"},
         {"leadTimeDays", "lead_time_days", "integer"},
         {"isActive", "is_active", "boolean"}},
        " FROM inv_item_warehouses iw "
        "LEFT JOIN inv_items i ON i.tenant_id=iw.tenant_id AND i.id=iw.item_id AND i.is_deleted=false "
        "LEFT JOIN inv_warehouses w ON w.tenant_id=iw.tenant_id AND w.id=iw.warehouse_id AND w.is_deleted=false "
        "LEFT JOIN inv_bin_locations lb ON lb.tenant_id=iw.tenant_id AND lb.id=iw.default_bin_id AND lb.is_deleted=false",
        "'itemCode',i.item_code,'itemName',i.name,'warehouseCode',w.code,'warehouseName',w.name,'defaultBinCode',lb.code",
        "jsonb_build_object('id',iw.id,'itemCode',i.item_code,'warehouseName',w.name)",
        "(strpos(lower(i.item_code||' '||i.name||' '||COALESCE(w.name,'')),lower($2))>0)",
        "lower(i.item_code),lower(w.name),iw.id"}},
      {"batches",
       {"inv_batches", "bt", "Batch",
        {{"itemId", "item_id", "uuid", true, 200, true},
         {"batchNumber", "batch_number", "text", true, 80},
         {"supplierBatchNumber", "supplier_batch_number", "text", false, 80},
         {"productionDate", "production_date", "date"},
         {"expiryDate", "expiry_date", "date"},
         {"qualityStatus", "quality_status", "text", true, 20},
         {"isActive", "is_active", "boolean"}},
        " FROM inv_batches bt LEFT JOIN inv_items i ON "
        "i.tenant_id=bt.tenant_id AND i.id=bt.item_id AND i.is_deleted=false",
        "'itemCode',i.item_code,'itemName',i.name",
        "jsonb_build_object('id',bt.id,'batchNumber',bt.batch_number,'expiryDate',bt.expiry_date,'qualityStatus',bt.quality_status)",
        "(strpos(lower(bt.batch_number||' '||i.item_code||' '||i.name),lower($2))>0)",
        "lower(bt.batch_number),bt.id", nullptr, true, true,
        {"pending", "accepted", "rejected", "quarantine"}, "qualityStatus"}},
      {"serials",
       {"inv_serial_numbers", "sn", "Serial number",
        {{"itemId", "item_id", "uuid", true, 200, true},
         {"serialNumber", "serial_number", "text", true, 120, true},
         {"batchId", "batch_id", "uuid"},
         {"warehouseId", "warehouse_id", "uuid", false, 200, true},
         {"status", "status", "text", false, 20},
         {"warrantyExpiryDate", "warranty_expiry_date", "date"}},
        " FROM inv_serial_numbers sn "
        "LEFT JOIN inv_items i ON i.tenant_id=sn.tenant_id AND i.id=sn.item_id AND i.is_deleted=false "
        "LEFT JOIN inv_warehouses w ON w.tenant_id=sn.tenant_id AND w.id=sn.warehouse_id AND w.is_deleted=false",
        "'itemCode',i.item_code,'itemName',i.name,'warehouseName',w.name",
        "jsonb_build_object('id',sn.id,'serialNumber',sn.serial_number,'status',sn.status,'itemCode',i.item_code)",
        "(strpos(lower(sn.serial_number||' '||i.item_code||' '||i.name),lower($2))>0)",
        "lower(sn.serial_number),sn.id", nullptr, false, false,
        {"in_stock", "defective", "retired", "returned"}, "status"}},
      {"item-suppliers",
       {"inv_item_suppliers", "s", "Item supplier",
        {{"itemId", "item_id", "uuid", true},
         {"supplierId", "supplier_id", "uuid", true},
         {"supplierItemCode", "supplier_item_code", "text", false, 80},
         {"supplierItemName", "supplier_item_name", "text", false, 200},
         {"purchaseUomId", "purchase_uom_id", "uuid"},
         {"unitPrice", "unit_price", "decimal"},
         {"currencyId", "currency_id", "uuid", true},
         {"leadTimeDays", "lead_time_days", "integer"},
         {"minOrderQuantity", "min_order_quantity", "decimal"},
         {"orderMultiple", "order_multiple", "decimal"},
         {"isPreferred", "is_preferred", "boolean"},
         {"isActive", "is_active", "boolean"}},
        " FROM inv_item_suppliers s "
        "LEFT JOIN inv_items i ON i.tenant_id=s.tenant_id AND i.id=s.item_id AND i.is_deleted=false "
        "LEFT JOIN core_suppliers sp ON sp.tenant_id=s.tenant_id AND sp.id=s.supplier_id AND sp.is_deleted=false",
        "'itemCode',i.item_code,'itemName',i.name,'supplierName',sp.name",
        "jsonb_build_object('id',s.id,'itemCode',i.item_code,'supplierName',sp.name)",
        "(strpos(lower(i.item_code||' '||i.name||' '||COALESCE(sp.name,'')),lower($2))>0)",
        "lower(i.item_code),lower(sp.name),s.id", nullptr, true, true}},
      {"item-uom-conversions",
       {"inv_item_uom_conversions", "cv", "Unit conversion",
        {{"itemId", "item_id", "uuid", true},
         {"fromUomId", "from_uom_id", "uuid", true},
         {"toUomId", "to_uom_id", "uuid", true},
         {"factor", "factor", "factor", true},
         {"isActive", "is_active", "boolean"}},
        " FROM inv_item_uom_conversions cv "
        "LEFT JOIN inv_items i ON i.tenant_id=cv.tenant_id AND i.id=cv.item_id AND i.is_deleted=false "
        "LEFT JOIN inv_units_of_measure fu ON fu.tenant_id=cv.tenant_id AND fu.id=cv.from_uom_id AND fu.is_deleted=false "
        "LEFT JOIN inv_units_of_measure tu ON tu.tenant_id=cv.tenant_id AND tu.id=cv.to_uom_id AND tu.is_deleted=false",
        "'itemCode',i.item_code,'fromUom',fu.code,'toUom',tu.code",
        "jsonb_build_object('id',cv.id,'itemCode',i.item_code,'fromUom',fu.code,'toUom',tu.code)",
        "(strpos(lower(i.item_code||' '||COALESCE(fu.code,'')||' '||COALESCE(tu.code,'')),lower($2))>0)",
        "lower(i.item_code),cv.id", nullptr, true, true}},
      {"items",
       {"inv_items", "i", "Item",
        {{"itemCode", "item_code", "text", true, 40},
         {"name", "name", "text", true, 200},
         {"description", "description", "text", false, 1000},
         {"itemCategoryId", "item_category_id", "uuid"},
         {"itemType", "item_type", "text", true, 20},
         {"status", "status", "text", true, 20},
         {"baseUomId", "base_uom_id", "uuid", true},
         {"purchaseUomId", "purchase_uom_id", "uuid"},
         {"salesUomId", "sales_uom_id", "uuid"},
         {"trackingMethod", "tracking_method", "text", true, 20},
         {"valuationMethod", "valuation_method", "text", true, 20},
         {"currencyId", "currency_id", "uuid", true},
         {"standardCost", "standard_cost", "decimal"},
         {"purchaseUnitCost", "purchase_unit_cost", "decimal"},
         {"saleUnitPrice", "sale_unit_price", "decimal"},
         {"isPurchasable", "is_purchasable", "boolean"},
         {"isSellable", "is_sellable", "boolean"},
         {"isTaxable", "is_taxable", "boolean"},
         {"barcode", "barcode", "text", false, 80},
         {"reorderPoint", "reorder_point", "decimal"},
         {"minStockLevel", "min_stock_level", "decimal"},
         {"maxStockLevel", "max_stock_level", "decimal"},
         {"reorderQuantity", "reorder_quantity", "decimal"},
         {"safetyStock", "safety_stock", "decimal"},
         {"leadTimeDays", "lead_time_days", "integer"},
         {"shelfLifeDays", "shelf_life_days", "integer"},
         {"grossWeight", "gross_weight", "decimal"},
         {"netWeight", "net_weight", "decimal"},
         {"volume", "volume", "decimal"},
         {"inventoryAccountId", "inventory_account_id", "uuid"},
         {"cogsAccountId", "cogs_account_id", "uuid"},
         {"revenueAccountId", "revenue_account_id", "uuid"},
         {"purchaseAccountId", "purchase_account_id", "uuid"},
         {"varianceAccountId", "variance_account_id", "uuid"},
         {"defaultWarehouseId", "default_warehouse_id", "uuid"}},
        " FROM inv_items i "
        "LEFT JOIN inv_item_categories cg ON cg.tenant_id=i.tenant_id AND cg.id=i.item_category_id AND cg.is_deleted=false "
        "LEFT JOIN inv_units_of_measure um ON um.tenant_id=i.tenant_id AND um.id=i.base_uom_id AND um.is_deleted=false "
        "LEFT JOIN core_currencies cr ON cr.id=i.currency_id",
        "'categoryName',cg.name,'baseUom',um.code,'baseUomName',um.name,"
        "'currencyCode',cr.code,'averageUnitCost',i.average_unit_cost::text,"
        "'lastUnitCost',i.last_unit_cost::text,"
        "'onHand',(SELECT COALESCE(sum(sb.quantity_on_hand),0) FROM "
        "inv_stock_balances sb WHERE sb.tenant_id=i.tenant_id AND "
        "sb.item_id=i.id AND sb.is_deleted=false)::text,"
        "'stockValue',(SELECT COALESCE(sum(sb.stock_value),0) FROM "
        "inv_stock_balances sb WHERE sb.tenant_id=i.tenant_id AND "
        "sb.item_id=i.id AND sb.is_deleted=false)::text",
        "jsonb_build_object('id',i.id,'itemCode',i.item_code,'name',i.name,"
        "'baseUomId',i.base_uom_id,'baseUom',um.code,'trackingMethod',i.tracking_method,"
        "'valuationMethod',i.valuation_method,'purchaseUnitCost',i.purchase_unit_cost::text,"
        "'averageUnitCost',i.average_unit_cost::text,'isPurchasable',i.is_purchasable)",
        "(strpos(lower(i.item_code||' '||i.name||' '||COALESCE(i.barcode,'')),lower($2))>0)",
        "lower(i.item_code),i.id", nullptr, true, true,
        {"stock", "non_stock", "service", "kit"}, "itemType"}},
  };
  return all;
}
std::string extraRules(const std::string &resource, Json::Value &b) {
  if (resource == "items") {
    if (!oneOf(b["status"].asString(), {"active", "inactive", "discontinued"}))
      return "status: unsupported value.";
    if (!oneOf(b["trackingMethod"].asString(), {"none", "batch", "serial"}))
      return "trackingMethod: unsupported value.";
    if (!oneOf(b["valuationMethod"].asString(),
               {"weighted_average", "fifo", "standard"}))
      return "valuationMethod: unsupported value.";
    if (std::stold(b["maxStockLevel"].asString()) != 0 &&
        std::stold(b["maxStockLevel"].asString()) <
            std::stold(b["minStockLevel"].asString()))
      return "maxStockLevel cannot be below minStockLevel.";
    if (std::stold(b["reorderPoint"].asString()) != 0 &&
        std::stold(b["reorderPoint"].asString()) <
            std::stold(b["safetyStock"].asString()))
      return "reorderPoint cannot be below safetyStock.";
    if (b["leadTimeDays"].asInt() > 3650 || b["shelfLifeDays"].asInt() > 36500)
      return "leadTimeDays/shelfLifeDays are out of range.";
  }
  if (resource == "uoms" && b["decimalPlaces"].asInt() > 6)
    return "decimalPlaces must be between 0 and 6.";
  if (resource == "item-warehouses") {
    if (std::stold(b["maxStockLevel"].asString()) != 0 &&
        std::stold(b["maxStockLevel"].asString()) <
            std::stold(b["minStockLevel"].asString()))
      return "maxStockLevel cannot be below minStockLevel.";
    if (b["leadTimeDays"].asInt() > 3650)
      return "leadTimeDays is out of range.";
  }
  if (resource == "item-suppliers" && b["leadTimeDays"].asInt() > 3650)
    return "leadTimeDays is out of range.";
  if (resource == "item-uom-conversions" &&
      b["fromUomId"].asString() == b["toUomId"].asString())
    return "fromUomId and toUomId must differ.";
  if (resource == "batches" && !b["productionDate"].isNull() &&
      !b["expiryDate"].isNull() &&
      b["expiryDate"].asString() < b["productionDate"].asString())
    return "expiryDate cannot precede productionDate.";
  if (resource == "serials" &&
      (!b["status"].isString() || b["status"].asString().empty()))
    b["status"] = "in_stock";
  return {};
}
std::string listSelect(const MasterSpec &spec) {
  return "SELECT (" + projection(spec) +
         (spec.labels.empty() ? "" : "||jsonb_build_object(" + spec.labels + ")") +
         ")::text AS record " + spec.from;
}
std::string filterSql(const MasterSpec &spec, bool scoped) {
  std::string w = " WHERE " + std::string(spec.alias) + ".tenant_id=$1 AND " +
                  spec.alias + ".is_deleted=false AND " + spec.search;
  if (scoped)
    w += " AND " + std::string(spec.unitColumn) + "=$3::uuid";
  return w;
}
// DML goes through jsonb_populate_record: the JSON keys are column names, so
// PostgreSQL performs the type coercion and unknown keys are impossible.
drogon::Task<dto::BaseApiResponse>
runMaster(DbClientPtr db, const std::string &resource, const std::string &op,
          const std::string &id, Json::Value b, int page, int size,
          const std::string &query, const std::string &unit, bool canWrite,
          utils::AuditIdentity who) {
  const auto &spec = specs().at(resource);
  const std::string q = search(query);
  dto::BaseApiResponse r;
  if (op == "list" || op == "options") {
    const bool scoped =
        op == "list" && spec.unitColumn != nullptr && !unit.empty();
    const std::string w = filterSql(spec, scoped);
    const int64_t limit = op == "options" ? 100 : size,
                  offset = op == "options" ? 0 : (int64_t(page) - 1) * size;
    std::string sel;
    if (op == "options")
      sel = "SELECT " + spec.optionsProjection + "::text AS record " +
            spec.from + w +
            (spec.hasActive ? " AND " + std::string(spec.alias) + ".is_active" : "") +
            " ORDER BY " + spec.orderBy + " LIMIT 100";
    else
      sel = listSelect(spec) + w + " ORDER BY " + spec.orderBy + " LIMIT " +
            (scoped ? "$4" : "$3") + "::bigint OFFSET " + (scoped ? "$5" : "$4") +
            "::bigint";
    auto rows =
        scoped ? co_await db->execSqlCoro(sel, who.tenantId, q, unit, limit, offset)
               : co_await db->execSqlCoro(sel, who.tenantId, q, limit, offset);
    if (op == "list") {
      const auto totals =
          scoped ? co_await db->execSqlCoro(
                       "SELECT count(*) AS total " + spec.from + w,
                       who.tenantId, q, unit)
                 : co_await db->execSqlCoro(
                       "SELECT count(*) AS total " + spec.from + w,
                       who.tenantId, q);
      r.result["totalCount"] = Json::Int64(totals[0]["total"].as<int64_t>());
      r.result["capabilities"]["canWrite"] = canWrite;
    } else {
      r.result["totalCount"] = Json::Int64(rows.size());
    }
    r.result["data"] = Json::arrayValue;
    for (const auto &row : rows)
      r.result["data"].append(parse(row["record"].as<std::string>()));
    r.success = true;
    co_return r;
  }
  if (op == "get") {
    const auto rows = co_await db->execSqlCoro(
        listSelect(spec) + " WHERE " + spec.alias + ".tenant_id=$1 AND " +
            spec.alias + ".id=$2::uuid AND " + spec.alias + ".is_deleted=false",
        who.tenantId, id);
    if (rows.empty())
      co_return fail("not_found", std::string(spec.label) + " not found.");
    r.result = parse(rows[0]["record"].as<std::string>());
    r.success = true;
    co_return r;
  }
  if (op == "create" || op == "update") {
    const std::string problem = validate(b, spec.fields, op == "update");
    if (!problem.empty())
      co_return fail("validation_error", problem);
    if (const auto issue = extraRules(resource, b); !issue.empty())
      co_return fail("validation_error", issue);
    if (spec.enumKey && !oneOf(b[spec.enumKey].asString(), spec.enums))
      co_return fail("validation_error",
                     std::string(spec.enumKey) + ": unsupported value.");
    if (op == "update") {
      const auto current = co_await db->execSqlCoro(
          "SELECT version FROM " + std::string(spec.table) +
              " WHERE tenant_id=$1 AND id=$2 AND is_deleted=false FOR UPDATE",
          who.tenantId, id);
      if (current.empty())
        co_return fail("not_found", std::string(spec.label) + " not found.");
      if (current[0]["version"].as<int>() != b["version"].asInt())
        co_return fail("conflict",
                       std::string(spec.label) + " changed. Reload before saving.");
    }
    Json::Value record;
    std::string columns, values, assignments;
    for (const auto &f : spec.fields) {
      if (op == "update" && f.createOnly)
        continue;
      record[f.column] = b[f.key];
      if (!columns.empty()) {
        columns += ",";
        values += ",";
        assignments += ",";
      }
      columns += f.column;
      values += "p." + std::string(f.column);
      assignments += std::string(f.column) + "=p." + f.column;
    }
    const std::string payload =
        Json::writeString(Json::StreamWriterBuilder{}, record);
    std::string savedId = id;
    if (op == "create") {
      const auto inserted = co_await db->execSqlCoro(
          "INSERT INTO " + std::string(spec.table) +
              "(tenant_id,created_by_user_id," + columns + ") SELECT " +
              "$1::uuid,$2::uuid," + values +
              " FROM jsonb_populate_record(NULL::" + spec.table +
              ",$3::jsonb) p RETURNING id",
          who.tenantId, who.userId, payload);
      savedId = inserted[0]["id"].as<std::string>();
    } else {
      co_await db->execSqlCoro(
          "UPDATE " + std::string(spec.table) + " e SET " + assignments +
              ",last_modified_at=now(),last_modified_by_user_id=$3,version=e."
              "version+1 FROM jsonb_populate_record(NULL::" +
              spec.table + ",$4::jsonb) p WHERE e.tenant_id=$1 AND e.id=$2 "
              "AND e.is_deleted=false",
          who.tenantId, id, who.userId, payload);
    }
    const auto saved = co_await db->execSqlCoro(
        listSelect(spec) + " WHERE " + spec.alias + ".tenant_id=$1 AND " +
            spec.alias + ".id=$2::uuid AND " + spec.alias + ".is_deleted=false",
        who.tenantId, savedId);
    if (saved.empty())
      co_return fail("not_found", std::string(spec.label) + " not found after save.");
    r.result = parse(saved[0]["record"].as<std::string>());
    r.success = true;
    co_return r;
  }
  if (op == "delete") {
    if (!spec.allowDelete)
      co_return fail("validation_error",
                     std::string(spec.label) +
                         " records are never deleted; retire or deactivate them.");
    const auto current = co_await db->execSqlCoro(
        "SELECT version FROM " + std::string(spec.table) +
            " WHERE tenant_id=$1 AND id=$2 AND is_deleted=false FOR UPDATE",
        who.tenantId, id);
    if (current.empty())
      co_return fail("not_found", std::string(spec.label) + " not found.");
    if (current[0]["version"].as<int>() != b["version"].asInt())
      co_return fail("conflict",
                     std::string(spec.label) + " changed. Reload before saving.");
    co_await db->execSqlCoro(
        "UPDATE " + std::string(spec.table) +
            " SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$3,"
            "last_modified_at=now(),last_modified_by_user_id=$3,version=version+1 "
            "WHERE tenant_id=$1 AND id=$2 AND is_deleted=false",
        who.tenantId, id, who.userId);
    r.result["id"] = id;
    r.success = true;
    co_return r;
  }
  co_return fail("validation_error", "Unsupported operation.");
}
// ---------------------------------------------------------------------------
// Stock balances read model: on-hand / reserved / in-transit per item, warehouse
// and batch, with computed availability.
// ---------------------------------------------------------------------------
drogon::Task<dto::BaseApiResponse> runBalances(DbClientPtr db, Json::Value filters,
                                               int page, int size,
                                               const std::string &query,
                                               utils::AuditIdentity who) {
  std::string w = " WHERE b.tenant_id=$1 AND b.is_deleted=false ";
  std::vector<std::string> args{who.tenantId, search(query)};
  auto add = [&](const char *key, const char *target) {
    const std::string v = filters.isMember(key) && filters[key].isString()
                              ? trim(filters[key].asString())
                              : "";
    if (!v.empty()) {
      w += " AND " + std::string(target) + "=$" +
           std::to_string(args.size() + 1) + "::uuid";
      args.push_back(v);
    }
  };
  add("itemId", "b.item_id");
  add("warehouseId", "b.warehouse_id");
  add("accountingUnitId", "w.accounting_unit_id");
  w += " AND strpos(lower(i.item_code||' '||i.name),lower($2))>0";
  const std::string from =
      " FROM inv_stock_balances b JOIN inv_items i ON i.tenant_id=b.tenant_id AND i.id=b.item_id "
      "AND i.is_deleted=false JOIN inv_warehouses w ON w.tenant_id=b.tenant_id AND w.id=b.warehouse_id "
      "LEFT JOIN inv_batches bt ON bt.tenant_id=b.tenant_id AND bt.id=b.batch_id AND bt.is_deleted=false";
  const std::string sel =
      "SELECT (jsonb_build_object('id',b.id,'itemId',b.item_id,'itemCode',i.item_code,"
      "'itemName',i.name,'warehouseId',b.warehouse_id,'warehouseName',w.name,"
      "'warehouseType',w.warehouse_type,'batchId',b.batch_id,'batchNumber',bt.batch_number,"
      "'quantityOnHand',b.quantity_on_hand::text,'quantityReserved',b.quantity_reserved::text,"
      "'quantityInTransit',b.quantity_in_transit::text,"
      "'available',(b.quantity_on_hand-b.quantity_reserved)::text,"
      "'averageUnitCost',b.average_unit_cost::text,'stockValue',b.stock_value::text,"
      "'lastMovementAt',b.last_movement_at))::text AS record " +
      from + w + " ORDER BY lower(i.item_code),lower(w.name),b.id LIMIT $" +
      std::to_string(args.size() + 1) + "::bigint OFFSET $" +
      std::to_string(args.size() + 2) + "::bigint";
  const int64_t limit = size, offset = (int64_t(page) - 1) * size;
  std::optional<drogon::orm::Result> rows, totals;
  if (args.size() == 2) {
    rows = co_await db->execSqlCoro(sel, args[0], args[1], limit, offset);
    totals = co_await db->execSqlCoro("SELECT count(*) AS total " + from + w, args[0], args[1]);
  } else if (args.size() == 3) {
    rows = co_await db->execSqlCoro(sel, args[0], args[1], args[2], limit, offset);
    totals = co_await db->execSqlCoro("SELECT count(*) AS total " + from + w,
                                      args[0], args[1], args[2]);
  } else if (args.size() == 4) {
    rows = co_await db->execSqlCoro(sel, args[0], args[1], args[2], args[3], limit, offset);
    totals = co_await db->execSqlCoro("SELECT count(*) AS total " + from + w,
                                      args[0], args[1], args[2], args[3]);
  } else {
    rows = co_await db->execSqlCoro(sel, args[0], args[1], args[2], args[3], args[4], limit, offset);
    totals = co_await db->execSqlCoro("SELECT count(*) AS total " + from + w,
                                      args[0], args[1], args[2], args[3], args[4]);
  }
  dto::BaseApiResponse r;
  r.result["data"] = Json::arrayValue;
  for (const auto &row : *rows)
    r.result["data"].append(parse(row["record"].as<std::string>()));
  r.result["totalCount"] = Json::Int64((*totals)[0]["total"].as<int64_t>());
  r.success = true;
  co_return r;
}
// ---------------------------------------------------------------------------
// Inventory ledger read model (immutable movement history with running balances).
// ---------------------------------------------------------------------------
drogon::Task<dto::BaseApiResponse> runLedger(DbClientPtr db, Json::Value filters,
                                             int page, int size,
                                             const std::string &query,
                                             utils::AuditIdentity who) {
  std::string w = " WHERE t.tenant_id=$1 ";
  std::vector<std::string> args{who.tenantId, search(query)};
  auto addU = [&](const char *key, const char *target) {
    const std::string v = filters.isMember(key) && filters[key].isString()
                              ? trim(filters[key].asString())
                              : "";
    if (!v.empty()) {
      w += " AND " + std::string(target) + "=$" + std::to_string(args.size() + 1) + "::uuid";
      args.push_back(v);
    }
  };
  auto addT = [&](const char *key, const char *target) {
    const std::string v = filters.isMember(key) && filters[key].isString()
                              ? trim(filters[key].asString())
                              : "";
    if (!v.empty()) {
      w += " AND " + std::string(target) + "=$" + std::to_string(args.size() + 1);
      args.push_back(v);
    }
  };
  addU("itemId", "t.item_id");
  addU("warehouseId", "t.warehouse_id");
  addU("accountingUnitId", "t.accounting_unit_id");
  addT("documentType", "t.document_type");
  const auto from2 = filters.isMember("dateFrom") && filters["dateFrom"].isString()
                         ? trim(filters["dateFrom"].asString()) : "";
  if (!from2.empty() && date(from2)) {
    w += " AND t.transaction_date>=$" + std::to_string(args.size() + 1) + "::date";
    args.push_back(from2);
  }
  const auto to = filters.isMember("dateTo") && filters["dateTo"].isString()
                      ? trim(filters["dateTo"].asString()) : "";
  if (!to.empty() && date(to)) {
    w += " AND t.transaction_date<=$" + std::to_string(args.size() + 1) + "::date";
    args.push_back(to);
  }
  w += " AND strpos(lower(t.document_number||' '||i.item_code||' '||i.name),lower($2))>0";
  const std::string from =
      " FROM inv_stock_transactions t JOIN inv_items i ON i.tenant_id=t.tenant_id AND i.id=t.item_id "
      "JOIN inv_warehouses w ON w.tenant_id=t.tenant_id AND w.id=t.warehouse_id "
      "LEFT JOIN inv_batches bt ON bt.tenant_id=t.tenant_id AND bt.id=t.batch_id AND bt.is_deleted=false";
  const std::string sel =
      "SELECT (jsonb_build_object('id',t.id,'documentId',t.document_id,"
      "'documentNumber',t.document_number,'documentType',t.document_type,"
      "'movementReason',t.movement_reason,'transactionDate',t.transaction_date,"
      "'itemId',t.item_id,'itemCode',i.item_code,'itemName',i.name,"
      "'warehouseId',t.warehouse_id,'warehouseName',w.name,'batchId',t.batch_id,"
      "'batchNumber',bt.batch_number,'quantity',t.quantity::text,'unitCost',t.unit_cost::text,"
      "'stockValue',t.stock_value::text,'balanceQuantity',t.balance_quantity::text,"
      "'balanceValue',t.balance_value::text,'costingMethod',t.costing_method,"
      "'referenceNumber',t.reference_number,'createdAt',t.created_at))::text AS record " +
      from + w + " ORDER BY t.transaction_date DESC,t.created_at DESC,t.id LIMIT $" +
      std::to_string(args.size() + 1) + "::bigint OFFSET $" +
      std::to_string(args.size() + 2) + "::bigint";
  const int64_t limit = size, offset = (int64_t(page) - 1) * size;
  std::optional<drogon::orm::Result> rows, totals;
  // Filter budget is bounded: item, warehouse, unit, type, from, to (<=8 args).
  switch (args.size()) {
  case 2:
    rows = co_await db->execSqlCoro(sel, args[0], args[1], limit, offset);
    totals = co_await db->execSqlCoro("SELECT count(*) AS total " + from + w, args[0], args[1]);
    break;
  case 3:
    rows = co_await db->execSqlCoro(sel, args[0], args[1], args[2], limit, offset);
    totals = co_await db->execSqlCoro("SELECT count(*) AS total " + from + w, args[0], args[1], args[2]);
    break;
  case 4:
    rows = co_await db->execSqlCoro(sel, args[0], args[1], args[2], args[3], limit, offset);
    totals = co_await db->execSqlCoro("SELECT count(*) AS total " + from + w, args[0], args[1], args[2], args[3]);
    break;
  case 5:
    rows = co_await db->execSqlCoro(sel, args[0], args[1], args[2], args[3], args[4], limit, offset);
    totals = co_await db->execSqlCoro("SELECT count(*) AS total " + from + w, args[0], args[1], args[2], args[3], args[4]);
    break;
  case 6:
    rows = co_await db->execSqlCoro(sel, args[0], args[1], args[2], args[3], args[4], args[5], limit, offset);
    totals = co_await db->execSqlCoro("SELECT count(*) AS total " + from + w, args[0], args[1], args[2], args[3], args[4], args[5]);
    break;
  case 7:
    rows = co_await db->execSqlCoro(sel, args[0], args[1], args[2], args[3], args[4], args[5], args[6], limit, offset);
    totals = co_await db->execSqlCoro("SELECT count(*) AS total " + from + w, args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
    break;
  default:
    rows = co_await db->execSqlCoro(sel, args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], limit, offset);
    totals = co_await db->execSqlCoro("SELECT count(*) AS total " + from + w, args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]);
    break;
  }
  dto::BaseApiResponse r;
  r.result["data"] = Json::arrayValue;
  for (const auto &row : *rows)
    r.result["data"].append(parse(row["record"].as<std::string>()));
  r.result["totalCount"] = Json::Int64((*totals)[0]["total"].as<int64_t>());
  r.success = true;
  co_return r;
}
// ---------------------------------------------------------------------------
// Valuation snapshots: freeze per-item stock value at a date.
// ---------------------------------------------------------------------------
drogon::Task<dto::BaseApiResponse> runSnapshots(DbClientPtr db, const std::string &op,
                                                const std::string &id, Json::Value b,
                                                int page, int size,
                                                const std::string &query,
                                                const std::string &unit,
                                                bool canWrite, utils::AuditIdentity who) {
  dto::BaseApiResponse r;
  const std::string q = search(query);
  if (op == "list") {
    const bool scoped = !unit.empty();
    std::string w = " WHERE s.tenant_id=$1 AND s.is_deleted=false AND "
                    "strpos(lower(COALESCE(a.code,'')),lower($2))>=0 ";
    if (scoped)
      w += " AND s.accounting_unit_id=$3::uuid";
    const int64_t limit = size, offset = (int64_t(page) - 1) * size;
    const std::string sel =
        "SELECT (jsonb_build_object('id',s.id,'version',s.version,"
        "'accountingUnitId',s.accounting_unit_id,'accountingUnitCode',a.code,"
        "'asOfDate',s.as_of_date,'status',s.status,'itemCount',s.item_count,"
        "'totalQuantity',s.total_quantity::text,'totalValue',s.total_value::text,"
        "'notes',s.notes,'journalBatchId',s.journal_batch_id,'postedAt',s.posted_at,"
        "'createdAt',s.created_at))::text AS record FROM inv_valuation_snapshots s "
        "LEFT JOIN core_accounting_units a ON a.tenant_id=s.tenant_id AND a.id=s.accounting_unit_id" +
        w + " ORDER BY s.as_of_date DESC,s.id LIMIT " +
        (scoped ? "$4::bigint OFFSET $5::bigint" : "$3::bigint OFFSET $4::bigint");
    auto rows = scoped ? co_await db->execSqlCoro(sel, who.tenantId, q, unit, limit, offset)
                       : co_await db->execSqlCoro(sel, who.tenantId, q, limit, offset);
    const auto totals =
        scoped ? co_await db->execSqlCoro(
                     "SELECT count(*) AS total FROM inv_valuation_snapshots s "
                     "LEFT JOIN core_accounting_units a ON a.tenant_id=s.tenant_id AND a.id=s.accounting_unit_id" + w,
                     who.tenantId, q, unit)
               : co_await db->execSqlCoro(
                     "SELECT count(*) AS total FROM inv_valuation_snapshots s "
                     "LEFT JOIN core_accounting_units a ON a.tenant_id=s.tenant_id AND a.id=s.accounting_unit_id" + w,
                     who.tenantId, q);
    r.result["data"] = Json::arrayValue;
    for (const auto &row : rows)
      r.result["data"].append(parse(row["record"].as<std::string>()));
    r.result["totalCount"] = Json::Int64(totals[0]["total"].as<int64_t>());
    r.result["capabilities"]["canWrite"] = canWrite;
    r.success = true;
    co_return r;
  }
  if (op == "get") {
    const auto head = co_await db->execSqlCoro(
        "SELECT (jsonb_build_object('id',s.id,'version',s.version,'accountingUnitId',s.accounting_unit_id,"
        "'accountingUnitCode',a.code,'asOfDate',s.as_of_date,'status',s.status,'itemCount',s.item_count,"
        "'totalQuantity',s.total_quantity::text,'totalValue',s.total_value::text,'notes',s.notes,"
        "'journalBatchId',s.journal_batch_id,'postedAt',s.posted_at,'createdAt',s.created_at))::text AS record "
        "FROM inv_valuation_snapshots s LEFT JOIN core_accounting_units a ON a.tenant_id=s.tenant_id "
        "AND a.id=s.accounting_unit_id WHERE s.tenant_id=$1 AND s.id=$2::uuid AND s.is_deleted=false",
        who.tenantId, id);
    if (head.empty())
      co_return fail("not_found", "Valuation snapshot not found.");
    r.result = parse(head[0]["record"].as<std::string>());
    const auto lines = co_await db->execSqlCoro(
        "SELECT (jsonb_build_object('itemId',l.item_id,'itemCode',i.item_code,'itemName',i.name,"
        "'warehouseId',l.warehouse_id,'warehouseName',w.name,'batchId',l.batch_id,'batchNumber',bt.batch_number,"
        "'quantityOnHand',l.quantity_on_hand::text,'unitCost',l.unit_cost::text,"
        "'stockValue',l.stock_value::text,'costingMethod',l.costing_method))::text AS record "
        "FROM inv_valuation_snapshot_lines l JOIN inv_items i ON i.tenant_id=l.tenant_id AND i.id=l.item_id "
        "JOIN inv_warehouses w ON w.tenant_id=l.tenant_id AND w.id=l.warehouse_id "
        "LEFT JOIN inv_batches bt ON bt.tenant_id=l.tenant_id AND bt.id=l.batch_id AND bt.is_deleted=false "
        "WHERE l.tenant_id=$1 AND l.snapshot_id=$2::uuid AND l.is_deleted=false "
        "ORDER BY lower(i.item_code),lower(w.name),l.id LIMIT 500",
        who.tenantId, id);
    r.result["lines"] = Json::arrayValue;
    for (const auto &row : lines)
      r.result["lines"].append(parse(row["record"].as<std::string>()));
    r.success = true;
    co_return r;
  }
  if (op == "capture") {
    b.removeMember("version");
    const std::set<std::string> allowed{"accountingUnitId", "asOfDate", "notes"};
    for (const auto &key : b.getMemberNames())
      if (!allowed.count(key))
        co_return fail("validation_error", "Unknown field: " + key);
    if (!b["accountingUnitId"].isString() || !uuid(b["accountingUnitId"].asString()))
      co_return fail("validation_error", "accountingUnitId: a UUID is required.");
    b["accountingUnitId"] = lower(b["accountingUnitId"].asString());
    if (!b["asOfDate"].isString() || !date(trim(b["asOfDate"].asString())))
      co_return fail("validation_error", "asOfDate: use a valid ISO date (1900-2999).");
    b["asOfDate"] = trim(b["asOfDate"].asString());
    if (!b["notes"].isString() || !text(b["notes"].asString(), 1000))
      co_return fail("validation_error", "notes: 1-1000 characters.");
    const auto unitRow = co_await db->execSqlCoro(
        "SELECT id FROM core_accounting_units WHERE tenant_id=$1 AND id=$2 AND "
        "is_deleted=false AND is_active=true FOR SHARE",
        who.tenantId, b["accountingUnitId"].asString());
    if (unitRow.empty())
      co_return fail("not_found", "Accounting unit not found.");
    const auto inserted = co_await db->execSqlCoro(
        "INSERT INTO inv_valuation_snapshots(tenant_id,accounting_unit_id,as_of_date,notes,created_by_user_id) "
        "VALUES($1,$2::uuid,$3::date,$4,$5) RETURNING id",
        who.tenantId, b["accountingUnitId"].asString(), b["asOfDate"].asString(),
        b["notes"].asString(), who.userId);
    const std::string snapId = inserted[0]["id"].as<std::string>();
    const auto totals = co_await db->execSqlCoro(
        "WITH ins AS (INSERT INTO inv_valuation_snapshot_lines(tenant_id,snapshot_id,item_id,warehouse_id,"
        "batch_id,quantity_on_hand,unit_cost,stock_value,costing_method,created_by_user_id) "
        "SELECT b.tenant_id,$2::uuid,b.item_id,b.warehouse_id,b.batch_id,b.quantity_on_hand,"
        "b.average_unit_cost,b.stock_value,i.valuation_method,$3::uuid "
        "FROM inv_stock_balances b "
        "JOIN inv_warehouses w ON w.tenant_id=b.tenant_id AND w.id=b.warehouse_id AND w.is_deleted=false "
        "JOIN inv_items i ON i.tenant_id=b.tenant_id AND i.id=b.item_id AND i.is_deleted=false "
        "WHERE b.tenant_id=$1 AND w.accounting_unit_id=$4::uuid AND b.is_deleted=false "
        "RETURNING quantity_on_hand,stock_value) "
        "SELECT count(*) AS n,COALESCE(sum(quantity_on_hand),0)::text AS q,COALESCE(sum(stock_value),0)::text AS v FROM ins",
        who.tenantId, snapId, who.userId, b["accountingUnitId"].asString());
    co_await db->execSqlCoro(
        "UPDATE inv_valuation_snapshots SET item_count=$3::int,total_quantity=($4::text)::numeric,"
        "total_value=($5::text)::numeric,last_modified_at=now(),last_modified_by_user_id=$6 "
        "WHERE tenant_id=$1 AND id=$2::uuid",
        who.tenantId, snapId, totals[0]["n"].as<int>(), totals[0]["q"].as<std::string>(),
        totals[0]["v"].as<std::string>(), who.userId);
    r.result["id"] = snapId;
    r.result["itemCount"] = totals[0]["n"].as<int>();
    r.result["totalQuantity"] = totals[0]["q"].as<std::string>();
    r.result["totalValue"] = totals[0]["v"].as<std::string>();
    r.success = true;
    co_return r;
  }
  co_return fail("validation_error", "Unsupported snapshot operation.");
}
// ---------------------------------------------------------------------------
// Inventory period closes: prepare computes blockers, close seals the period.
// ---------------------------------------------------------------------------
drogon::Task<dto::BaseApiResponse> runCloses(DbClientPtr db, const std::string &op,
                                             const std::string &id, Json::Value b,
                                             int page, int size,
                                             const std::string &unit, bool canWrite,
                                             utils::AuditIdentity who) {
  dto::BaseApiResponse r;
  const std::string closeSelect =
      "SELECT (jsonb_build_object('id',c.id,'version',c.version,'accountingUnitId',c.accounting_unit_id,"
      "'accountingUnitCode',a.code,'periodId',c.period_id,'period',p.period,'periodStart',p.period_start_date,"
      "'periodEnd',p.period_end_date,'status',c.status,'blockers',c.blockers,'documentsPosted',c.documents_posted,"
      "'documentsPending',c.documents_pending,'totalMovementValue',c.total_movement_value::text,"
      "'valuationSnapshotId',c.valuation_snapshot_id,'journalBatchId',c.journal_batch_id,'notes',c.notes,"
      "'closedAt',c.closed_at,'createdAt',c.created_at))::text AS record "
      "FROM inv_period_closes c JOIN gl_accounting_periods p ON p.tenant_id=c.tenant_id AND p.id=c.period_id "
      "LEFT JOIN core_accounting_units a ON a.tenant_id=c.tenant_id AND a.id=c.accounting_unit_id";
  if (op == "list") {
    const bool scoped = !unit.empty();
    std::string w = " WHERE c.tenant_id=$1 AND c.is_deleted=false";
    if (scoped)
      w += " AND c.accounting_unit_id=$2::uuid";
    const int64_t limit = size, offset = (int64_t(page) - 1) * size;
    const auto rows =
        scoped ? co_await db->execSqlCoro(closeSelect + w + " ORDER BY p.period DESC,c.id LIMIT $3::bigint OFFSET $4::bigint",
                                          who.tenantId, unit, limit, offset)
               : co_await db->execSqlCoro(closeSelect + w + " ORDER BY p.period DESC,c.id LIMIT $2::bigint OFFSET $3::bigint",
                                          who.tenantId, limit, offset);
    const auto totals =
        scoped ? co_await db->execSqlCoro(
                     "SELECT count(*) AS total FROM inv_period_closes c WHERE c.tenant_id=$1 AND c.is_deleted=false AND c.accounting_unit_id=$2::uuid",
                     who.tenantId, unit)
               : co_await db->execSqlCoro(
                     "SELECT count(*) AS total FROM inv_period_closes c WHERE c.tenant_id=$1 AND c.is_deleted=false",
                     who.tenantId);
    r.result["data"] = Json::arrayValue;
    for (const auto &row : rows)
      r.result["data"].append(parse(row["record"].as<std::string>()));
    r.result["totalCount"] = Json::Int64(totals[0]["total"].as<int64_t>());
    r.result["capabilities"]["canWrite"] = canWrite;
    r.success = true;
    co_return r;
  }
  if (op == "get") {
    const auto rows = co_await db->execSqlCoro(
        closeSelect + " WHERE c.tenant_id=$1 AND c.id=$2::uuid AND c.is_deleted=false",
        who.tenantId, id);
    if (rows.empty())
      co_return fail("not_found", "Inventory period close not found.");
    r.result = parse(rows[0]["record"].as<std::string>());
    r.success = true;
    co_return r;
  }
  // prepare / close share the same validated scope.
  if (!b["accountingUnitId"].isString() || !uuid(b["accountingUnitId"].asString()) ||
      !b["periodId"].isString() || !uuid(b["periodId"].asString()))
    co_return fail("validation_error", "accountingUnitId and periodId are required.");
  const std::string uid = lower(b["accountingUnitId"].asString()),
                      pid = lower(b["periodId"].asString());
  const auto period = co_await db->execSqlCoro(
      "SELECT id,period,status,period_start_date::text AS from_date,period_end_date::text AS to_date "
      "FROM gl_accounting_periods WHERE tenant_id=$1 AND accounting_unit_id=$2 AND id=$3::uuid "
      "AND is_deleted=false FOR SHARE",
      who.tenantId, uid, pid);
  if (period.empty())
    co_return fail("not_found", "Accounting period not found for this unit.");
  const std::string fromD = period[0]["from_date"].as<std::string>(),
                    toD = period[0]["to_date"].as<std::string>();
  if (op == "prepare" || op == "close") {
    // Recompute the close picture inside the transaction: nothing between
    // prepare and close can sneak open documents into the period.
    const auto stats = co_await db->execSqlCoro(
        "SELECT "
        "COALESCE(sum(CASE WHEN d.status IN('draft','submitted','approved') THEN 1 ELSE 0 END),0)::int AS pending,"
        "COALESCE(sum(CASE WHEN d.status IN('posted','reversed') THEN 1 ELSE 0 END),0)::int AS posted "
        "FROM inv_stock_documents d WHERE d.tenant_id=$1 AND d.accounting_unit_id=$2 AND d.is_deleted=false "
        "AND d.document_date BETWEEN $3::date AND $4::date",
        who.tenantId, uid, fromD, toD);
    const auto moving = co_await db->execSqlCoro(
        "SELECT COALESCE(sum(abs(t.stock_value)),0)::text AS v FROM inv_stock_transactions t "
        "WHERE t.tenant_id=$1 AND t.accounting_unit_id=$2 AND t.transaction_date BETWEEN $3::date AND $4::date",
        who.tenantId, uid, fromD, toD);
    const int pending = stats[0]["pending"].as<int>(),
              posted = stats[0]["posted"].as<int>();
    if (op == "close" && pending > 0)
      co_return fail("conflict",
                     std::to_string(pending) +
                         " stock documents in this period are still unposted. "
                         "Post or cancel them before closing.");
    const std::string blockers =
        pending > 0
            ? "[{\"type\":\"open_documents\",\"count\":" + std::to_string(pending) + "}]"
            : "[]";
    if (op == "close") {
      // One valuation snapshot per unit and period-end date; reuse it when the
      // close was rehearsed before.
      const auto existing = co_await db->execSqlCoro(
          "SELECT id FROM inv_valuation_snapshots WHERE tenant_id=$1 AND accounting_unit_id=$2::uuid "
          "AND as_of_date=$3::date AND is_deleted=false",
          who.tenantId, uid, toD);
      std::string snapId;
      if (!existing.empty()) {
        snapId = existing[0]["id"].as<std::string>();
      } else {
        const auto snap = co_await db->execSqlCoro(
            "INSERT INTO inv_valuation_snapshots(tenant_id,accounting_unit_id,as_of_date,notes,created_by_user_id) "
            "VALUES($1,$2::uuid,$3::date,$4,$5) RETURNING id",
            who.tenantId, uid, toD, "Period close valuation", who.userId);
        snapId = snap[0]["id"].as<std::string>();
        const auto totals = co_await db->execSqlCoro(
            "WITH ins AS (INSERT INTO inv_valuation_snapshot_lines(tenant_id,snapshot_id,item_id,warehouse_id,"
            "batch_id,quantity_on_hand,unit_cost,stock_value,costing_method,created_by_user_id) "
            "SELECT b.tenant_id,$2::uuid,b.item_id,b.warehouse_id,b.batch_id,b.quantity_on_hand,"
            "b.average_unit_cost,b.stock_value,i.valuation_method,$3::uuid "
            "FROM inv_stock_balances b JOIN inv_warehouses w ON w.tenant_id=b.tenant_id AND w.id=b.warehouse_id "
            "AND w.is_deleted=false JOIN inv_items i ON i.tenant_id=b.tenant_id AND i.id=b.item_id AND i.is_deleted=false "
            "WHERE b.tenant_id=$1 AND w.accounting_unit_id=$4::uuid AND b.is_deleted=false "
            "RETURNING quantity_on_hand,stock_value) "
            "SELECT count(*) AS n,COALESCE(sum(quantity_on_hand),0)::text AS q,COALESCE(sum(stock_value),0)::text AS v FROM ins",
            who.tenantId, snapId, who.userId, uid);
        co_await db->execSqlCoro(
            "UPDATE inv_valuation_snapshots SET item_count=$3::int,total_quantity=($4::text)::numeric,"
            "total_value=($5::text)::numeric,last_modified_at=now(),last_modified_by_user_id=$6 "
            "WHERE tenant_id=$1 AND id=$2::uuid",
            who.tenantId, snapId, totals[0]["n"].as<int>(), totals[0]["q"].as<std::string>(),
            totals[0]["v"].as<std::string>(), who.userId);
      }
      const auto closed = co_await db->execSqlCoro(
          "INSERT INTO inv_period_closes(tenant_id,accounting_unit_id,period_id,status,blockers,"
          "documents_posted,documents_pending,total_movement_value,valuation_snapshot_id,closed_at,"
          "closed_by_user_id,created_by_user_id) "
          "VALUES($1,$2::uuid,$3::uuid,'closed','[]'::jsonb,$4::int,0,($5::text)::numeric,$6::uuid,now(),$7,$7) "
          "ON CONFLICT(tenant_id,accounting_unit_id,period_id) WHERE is_deleted=false DO UPDATE SET "
          "status='closed',blockers='[]'::jsonb,documents_posted=$4::int,documents_pending=0,"
          "total_movement_value=($5::text)::numeric,valuation_snapshot_id=$6::uuid,closed_at=now(),"
          "closed_by_user_id=$7,last_modified_at=now(),last_modified_by_user_id=$7,version=inv_period_closes.version+1 "
          "RETURNING id",
          who.tenantId, uid, pid, posted, moving[0]["v"].as<std::string>(), snapId, who.userId);
      if (closed.empty())
        co_return fail("conflict", "Inventory period is already closed.");
      r.result["id"] = closed[0]["id"].as<std::string>();
      r.result["valuationSnapshotId"] = snapId;
      r.success = true;
      co_return r;
    }
    // prepare: upsert an open close row and report the live picture.
    const auto prepared = co_await db->execSqlCoro(
        "INSERT INTO inv_period_closes(tenant_id,accounting_unit_id,period_id,status,blockers,"
        "documents_posted,documents_pending,total_movement_value,created_by_user_id) "
        "VALUES($1,$2::uuid,$3::uuid,'open',$4::jsonb,$5::int,$6::int,($7::text)::numeric,$8) "
        "ON CONFLICT(tenant_id,accounting_unit_id,period_id) WHERE is_deleted=false DO UPDATE SET "
        "blockers=$4::jsonb,documents_posted=$5::int,documents_pending=$6::int,"
        "total_movement_value=($7::text)::numeric,last_modified_at=now(),last_modified_by_user_id=$8 "
        "WHERE inv_period_closes.status='open' RETURNING id,status",
        who.tenantId, uid, pid, blockers, posted, pending,
        moving[0]["v"].as<std::string>(), who.userId);
    if (prepared.empty())
      co_return fail("conflict", "Inventory period is already closed.");
    r.result["id"] = prepared[0]["id"].as<std::string>();
    r.result["documentsPosted"] = posted;
    r.result["documentsPending"] = pending;
    r.result["blockers"] = parse(blockers);
    r.result["totalMovementValue"] = moving[0]["v"].as<std::string>();
    r.success = true;
    co_return r;
  }
  co_return fail("validation_error", "Unsupported close operation.");
}
// ---------------------------------------------------------------------------
// Item card: full item record plus stock positions and recent movements.
// ---------------------------------------------------------------------------
drogon::Task<dto::BaseApiResponse> runItemCard(DbClientPtr db, const std::string &id,
                                               utils::AuditIdentity who) {
  const auto &spec = specs().at("items");
  const auto head = co_await db->execSqlCoro(
      listSelect(spec) + " WHERE i.tenant_id=$1 AND i.id=$2::uuid AND i.is_deleted=false",
      who.tenantId, id);
  if (head.empty())
    co_return fail("not_found", "Item not found.");
  dto::BaseApiResponse r;
  r.result = parse(head[0]["record"].as<std::string>());
  const auto balances = co_await db->execSqlCoro(
      "SELECT (jsonb_build_object('warehouseId',b.warehouse_id,'warehouseName',w.name,"
      "'batchId',b.batch_id,'batchNumber',bt.batch_number,'quantityOnHand',b.quantity_on_hand::text,"
      "'quantityReserved',b.quantity_reserved::text,'quantityInTransit',b.quantity_in_transit::text,"
      "'available',(b.quantity_on_hand-b.quantity_reserved)::text,'averageUnitCost',b.average_unit_cost::text,"
      "'stockValue',b.stock_value::text,'lastMovementAt',b.last_movement_at))::text AS record "
      "FROM inv_stock_balances b JOIN inv_warehouses w ON w.tenant_id=b.tenant_id AND w.id=b.warehouse_id "
      "LEFT JOIN inv_batches bt ON bt.tenant_id=b.tenant_id AND bt.id=b.batch_id AND bt.is_deleted=false "
      "WHERE b.tenant_id=$1 AND b.item_id=$2::uuid AND b.is_deleted=false "
      "ORDER BY lower(w.name),b.id LIMIT 200",
      who.tenantId, id);
  r.result["balances"] = Json::arrayValue;
  for (const auto &row : balances)
    r.result["balances"].append(parse(row["record"].as<std::string>()));
  const auto moves = co_await db->execSqlCoro(
      "SELECT (jsonb_build_object('id',t.id,'documentId',t.document_id,'documentNumber',t.document_number,"
      "'documentType',t.document_type,'movementReason',t.movement_reason,'transactionDate',t.transaction_date,"
      "'warehouseName',w.name,'batchNumber',bt.batch_number,'quantity',t.quantity::text,'unitCost',t.unit_cost::text,"
      "'stockValue',t.stock_value::text,'balanceQuantity',t.balance_quantity::text,"
      "'balanceValue',t.balance_value::text,'createdAt',t.created_at))::text AS record "
      "FROM inv_stock_transactions t JOIN inv_warehouses w ON w.tenant_id=t.tenant_id AND w.id=t.warehouse_id "
      "LEFT JOIN inv_batches bt ON bt.tenant_id=t.tenant_id AND bt.id=t.batch_id AND bt.is_deleted=false "
      "WHERE t.tenant_id=$1 AND t.item_id=$2::uuid ORDER BY t.transaction_date DESC,t.created_at DESC,t.id LIMIT 50",
      who.tenantId, id);
  r.result["recentMovements"] = Json::arrayValue;
  for (const auto &row : moves)
    r.result["recentMovements"].append(parse(row["record"].as<std::string>()));
  const auto convs = co_await db->execSqlCoro(
      "SELECT (jsonb_build_object('id',cv.id,'fromUomId',cv.from_uom_id,'fromUom',fu.code,"
      "'toUomId',cv.to_uom_id,'toUom',tu.code,'factor',cv.factor::text,'isActive',cv.is_active))::text AS record "
      "FROM inv_item_uom_conversions cv JOIN inv_units_of_measure fu ON fu.tenant_id=cv.tenant_id AND fu.id=cv.from_uom_id "
      "JOIN inv_units_of_measure tu ON tu.tenant_id=cv.tenant_id AND tu.id=cv.to_uom_id "
      "WHERE cv.tenant_id=$1 AND cv.item_id=$2::uuid AND cv.is_deleted=false ORDER BY fu.code LIMIT 50",
      who.tenantId, id);
  r.result["uomConversions"] = Json::arrayValue;
  for (const auto &row : convs)
    r.result["uomConversions"].append(parse(row["record"].as<std::string>()));
  r.success = true;
  co_return r;
}
// ---------------------------------------------------------------------------
// Dashboard KPIs.
// ---------------------------------------------------------------------------
drogon::Task<dto::BaseApiResponse> runDashboard(DbClientPtr db, const std::string &unit,
                                                utils::AuditIdentity who) {
  const bool scoped = !unit.empty();
  const std::string unitJoin = scoped ? " AND w.accounting_unit_id=$2::uuid" : "";
  const std::string sql =
      "SELECT jsonb_build_object("
      "'items',(SELECT count(*) FROM inv_items i WHERE i.tenant_id=$1 AND i.is_deleted=false),"
      "'activeWarehouses',(SELECT count(*) FROM inv_warehouses w WHERE w.tenant_id=$1 AND w.is_deleted=false AND w.is_active=true" +
      (scoped ? std::string(" AND w.accounting_unit_id=$2::uuid") : std::string()) + "),"
      "'batchesExpiring30d',(SELECT count(*) FROM inv_batches bt WHERE bt.tenant_id=$1 AND bt.is_deleted=false "
      "AND bt.is_active AND bt.expiry_date IS NOT NULL AND bt.expiry_date>=CURRENT_DATE "
      "AND bt.expiry_date<=CURRENT_DATE+30),"
      "'pendingDocuments',(SELECT count(*) FROM inv_stock_documents d WHERE d.tenant_id=$1 AND d.is_deleted=false "
      "AND d.status IN('submitted','approved')" +
      (scoped ? std::string(" AND d.accounting_unit_id=$2::uuid") : std::string()) + "),"
      "'movements30d',(SELECT count(*) FROM inv_stock_transactions t WHERE t.tenant_id=$1 AND "
      "t.transaction_date>=CURRENT_DATE-30" +
      (scoped ? std::string(" AND t.accounting_unit_id=$2::uuid") : std::string()) + "),"
      "'lowStockItems',(SELECT count(*) FROM inv_items i WHERE i.tenant_id=$1 AND i.is_deleted=false "
      "AND i.reorder_point>0 AND COALESCE((SELECT sum(b.quantity_on_hand) FROM inv_stock_balances b "
      "JOIN inv_warehouses w ON w.tenant_id=b.tenant_id AND w.id=b.warehouse_id "
      "WHERE b.tenant_id=i.tenant_id AND b.item_id=i.id AND b.is_deleted=false" + unitJoin + "),0)<=i.reorder_point),"
      "'stockValue',(SELECT COALESCE(sum(sb.stock_value),0)::text FROM inv_stock_balances sb "
      "JOIN inv_warehouses w ON w.tenant_id=sb.tenant_id AND w.id=sb.warehouse_id "
      "WHERE sb.tenant_id=$1 AND sb.is_deleted=false" + unitJoin + "))::text AS record";
  auto kpis = scoped ? co_await db->execSqlCoro(sql, who.tenantId, unit)
                     : co_await db->execSqlCoro(sql, who.tenantId);
  dto::BaseApiResponse r;
  if (!kpis.empty())
    r.result = parse(kpis[0]["record"].as<std::string>());
  r.success = true;
  co_return r;
}
} // namespace
// ---------------------------------------------------------------------------
// Public entry: "<resource>.<action>".
// ---------------------------------------------------------------------------
drogon::Task<dto::BaseApiResponse>
InventoryService::execute(std::string op, std::string id, Json::Value body,
                          int page, int size, std::string query,
                          std::string unitId, utils::AuditIdentity who) {
  const auto dot = op.rfind('.');
  const std::string resource = dot == std::string::npos ? "" : op.substr(0, dot),
                    action = dot == std::string::npos ? op : op.substr(dot + 1);
  static const std::set<std::string> readActions{"list", "options", "get", "card", "summary"};
  static const std::set<std::string> writeActions{"create", "update", "delete", "capture", "prepare", "close"};
  if (resource.empty() || (!readActions.count(action) && !writeActions.count(action)) ||
      page < 1 || page > 1000000 || size < 1 || size > 100 || !text(query, 200))
    co_return fail("validation_error", "Invalid operation, paging or search.");
  const bool write = writeActions.count(action);
  std::string unit;
  if (!unitId.empty()) {
    if (!uuid(unitId))
      co_return fail("validation_error", "accountingUnitId: a UUID is required.");
    unit = lower(unitId);
  }
  const bool needsId = action == "get" || action == "update" || action == "delete" ||
                       action == "card";
  if (needsId && !uuid(id))
    co_return fail("validation_error", "A valid record ID is required.");
  if (action == "delete" &&
      (!body.isObject() || body.getMemberNames() != std::vector<std::string>{"version"} ||
       !body["version"].isInt() || body["version"].asInt() < 1))
    co_return fail("validation_error", "A record version is required to delete.");
  if (!specs().count(resource) && resource != "balances" && resource != "ledger" &&
      resource != "snapshots" && resource != "closes" && resource != "dashboard")
    co_return fail("not_found", "Unknown inventory resource.");
  try {
    auto db = drogon::app().getDbClient();
    static const std::vector<std::string> requiredTables{
        "inv_items", "inv_warehouses", "inv_stock_balances"};
    if (!(co_await schemaReady(db, requiredTables)))
      co_return fail("schema_not_ready",
                     "Inventory upgrade required: apply migrations 029-035 first.");
    bool canWrite = false;
    if (!write) {
      const auto authz =
          co_await inventory_internal::authorize(db, who, write, "inventory", canWrite);
      if (!authz.success)
        co_return authz;
      if (resource == "balances" && action == "list")
        co_return co_await runBalances(db, body, page, size, query, who);
      if (resource == "ledger" && action == "list")
        co_return co_await runLedger(db, body, page, size, query, who);
      if (resource == "snapshots")
        co_return co_await runSnapshots(db, action, id, body, page, size, query, unit, canWrite, who);
      if (resource == "closes")
        co_return co_await runCloses(db, action, id, body, page, size, unit, canWrite, who);
      if (resource == "dashboard" && action == "summary")
        co_return co_await runDashboard(db, unit, who);
      if (resource == "items" && action == "card")
        co_return co_await runItemCard(db, id, who);
      if (resource != "balances" && resource != "ledger" && resource != "snapshots" &&
          resource != "closes" && resource != "dashboard")
        co_return co_await runMaster(db, resource, action, id, body, page, size, query, unit, canWrite, who);
      co_return fail("validation_error", "Unsupported operation.");
    }
    if (resource == "balances" || resource == "ledger" || resource == "dashboard")
      co_return fail("validation_error", "Stock facts are read-only; post documents to move stock.");
    auto tx = co_await db->newTransactionCoro();
    dto::BaseApiResponse result;
    try {
      // Authorization (row locks + SET LOCAL) lives inside the transaction.
      const auto authz =
          co_await inventory_internal::authorize(tx, who, write, "inventory", canWrite);
      if (!authz.success) {
        result = authz;
      } else if (resource == "snapshots") {
        result = co_await runSnapshots(tx, action, id, body, page, size, query, unit, canWrite, who);
      } else if (resource == "closes") {
        result = co_await runCloses(tx, action, id, body, page, size, unit, canWrite, who);
      } else {
        result = co_await runMaster(tx, resource, action, id, body, page, size, query, unit, canWrite, who);
      }
    } catch (...) {
      tx->rollback();
      throw;
    }
    if (!result.success) {
      tx->rollback();
      co_return result;
    }
    if (!(co_await utils::CommitTransaction{std::move(tx)}))
      co_return fail("database_error", "Unable to commit inventory changes.");
    co_return result;
  } catch (const drogon::orm::UniqueViolation &) {
    co_return fail("conflict", "These inventory details are already in use.");
  } catch (const drogon::orm::Failure &e) {
    const auto message = inventory_internal::knownMessage(e.what() ? e.what() : "");
    if (!message.empty())
      co_return fail("conflict", message);
    co_return fail("database_error",
                   "Inventory service unavailable. Verify migrations 029-035 are installed.");
  } catch (const std::exception &) {
    co_return fail("database_error",
                   "Inventory service unavailable. Verify migrations 029-035 are installed.");
  }
}
} // namespace business_desk::domain_services
