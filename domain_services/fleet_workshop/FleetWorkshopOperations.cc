#include "FleetWorkshopInternal.h"
#include "domain_services/gl/JournalService.h"
#include "domain_services/inventory/InventoryService.h"
#include "domain_services/supply_chain/SupplyChainService.h"

namespace business_desk::domain_services::fwm_internal {
namespace {

dto::BaseApiResponse okRecord(const Json::Value &record) {
  dto::BaseApiResponse r;
  r.result = record;
  r.success = true;
  return r;
}

drogon::Task<void> addComponentEvent(DbClientPtr tx, const utils::AuditIdentity &who,
                                     const std::string &componentId, const std::string &vehicleId,
                                     const std::string &eventType, const std::string &eventDate,
                                     const std::string &cumOdo, const std::string &condition,
                                     bool scrapped, const std::string &repairCost,
                                     const std::string &jobCardId, const std::string &notes) {
  co_await tx->execSqlCoro(
      "INSERT INTO fwm_component_events(tenant_id,component_id,vehicle_id,event_type,event_date,"
      "cum_odo_reading,condition,scrapped,repair_cost,job_card_id,notes,version,created_by_user_id) "
      "SELECT $1::uuid,$2::uuid,NULLIF($3,'')::uuid,$4,$5::date,($6::text)::numeric,$7,$8,"
      "($9::text)::numeric,NULLIF($10,'')::uuid,$11,"
      "COALESCE((SELECT max(version) FROM fwm_component_events WHERE tenant_id=$1 AND component_id=$2::uuid),0)+1,"
      "$12::uuid",
      who.tenantId, componentId, vehicleId, eventType, eventDate, cumOdo, condition, scrapped,
      repairCost, jobCardId, notes, who.userId);
  co_return;
}

drogon::Task<void> addTyreEvent(DbClientPtr tx, const utils::AuditIdentity &who,
                                const std::string &tyreId, const std::string &vehicleId,
                                const std::string &eventType, const std::string &eventDate,
                                const std::string &axlePos, const std::string &meterReading,
                                const std::string &treadDepth, const std::string &cost,
                                const std::string &locationNote, const std::string &jobCardId,
                                const std::string &notes) {
  co_await tx->execSqlCoro(
      "INSERT INTO fwm_tyre_events(tenant_id,tyre_id,vehicle_id,event_type,event_date,"
      "axle_position,meter_reading,tread_depth_mm,cost,location_note,job_card_id,notes,"
      "version,created_by_user_id) "
      "SELECT $1::uuid,$2::uuid,NULLIF($3,'')::uuid,$4,$5::date,$6,($7::text)::numeric,"
      "($8::text)::numeric,($9::text)::numeric,$10,NULLIF($11,'')::uuid,$12,"
      "COALESCE((SELECT max(version) FROM fwm_tyre_events WHERE tenant_id=$1 AND tyre_id=$2::uuid),0)+1,"
      "$13::uuid",
      who.tenantId, tyreId, vehicleId, eventType, eventDate, axlePos, meterReading, treadDepth,
      cost, locationNote, jobCardId, notes, who.userId);
  co_return;
}

drogon::Task<dto::BaseApiResponse>
meterChanges(DbClientPtr db, const std::string &action, Json::Value body, int page, int size,
             const std::string &query, const utils::AuditIdentity &who, bool canWrite) {
  if (action == "list") {
    const std::string q = search(query);
    const std::string vid = body.isObject() && body["vehicleId"].isString()
                                ? lower(trim(body["vehicleId"].asString()))
                                : "";
    const std::string vidScope = uuidOrEmpty(vid);
    const auto cnt = co_await db->execSqlCoro(
        "SELECT count(*) AS total FROM fwm_meter_changes mc "
        "JOIN fwm_vehicles v ON v.tenant_id=mc.tenant_id AND v.id=mc.vehicle_id AND v.is_deleted=false "
        "WHERE mc.tenant_id=$1 AND mc.is_deleted=false AND ($2='' OR mc.vehicle_id=$2::uuid) "
        "AND ($3='' OR strpos(lower(v.asset_no||' '||v.registration_no||' '||mc.replacement_label),lower($3))>0)",
        who.tenantId, vidScope, q);
    const auto rows = co_await db->execSqlCoro(
        "SELECT jsonb_build_object('id',mc.id,'vehicleId',mc.vehicle_id,'assetNo',v.asset_no,"
        "'registrationNo',v.registration_no,'changeDate',mc.change_date,"
        "'lastDateOnOldMeter',mc.last_date_on_old_meter,'oldMeterReading',mc.old_meter_reading::text,"
        "'newMeterReading',mc.new_meter_reading::text,'replacementLabel',mc.replacement_label,"
        "'engineChanged',mc.engine_changed,'meterStalled',mc.meter_stalled,"
        "'cumulativeOffsetDelta',mc.cumulative_offset_delta::text,'notes',mc.notes)::text AS record "
        "FROM fwm_meter_changes mc "
        "JOIN fwm_vehicles v ON v.tenant_id=mc.tenant_id AND v.id=mc.vehicle_id AND v.is_deleted=false "
        "WHERE mc.tenant_id=$1 AND mc.is_deleted=false AND ($2='' OR mc.vehicle_id=$2::uuid) "
        "AND ($3='' OR strpos(lower(v.asset_no||' '||v.registration_no||' '||mc.replacement_label),lower($3))>0) "
        "ORDER BY mc.change_date DESC, mc.created_at DESC LIMIT $4 OFFSET $5",
        who.tenantId, vidScope, q, size, static_cast<long long>(page - 1) * size);
    dto::BaseApiResponse r;
    r.result["data"] = Json::arrayValue;
    for (const auto &row : rows)
      r.result["data"].append(parse(row["record"].as<std::string>()));
    r.result["totalCount"] = Json::Int64(cnt[0]["total"].as<long long>());
    r.result["canWrite"] = canWrite;
    r.success = true;
    co_return r;
  }
  if (action != "create")
    co_return fail("validation_error", "Unsupported meter-changes action.");
  std::string err;
  if (!allowedFields(body, {"vehicleId", "changeDate", "lastDateOnOldMeter", "oldMeterReading",
                            "newMeterReading", "replacementLabel", "engineChanged", "meterStalled",
                            "notes"},
                     err) ||
      !validUuidOpt(body, "vehicleId", err, true) ||
      !validDate(body, "changeDate", err, true) ||
      !validDate(body, "lastDateOnOldMeter", err, true) ||
      !validDec(body, "oldMeterReading", err, "0") ||
      !validDec(body, "newMeterReading", err, "0") ||
      !validText(body, "replacementLabel", 60, err, false, "1st replacement") ||
      !validBool(body, "engineChanged", err, false) ||
      !validBool(body, "meterStalled", err, false) ||
      !validText(body, "notes", 500, err))
    co_return fail("validation_error", err);
  if (body["changeDate"].asString() < body["lastDateOnOldMeter"].asString())
    co_return fail("validation_error", "changeDate cannot precede lastDateOnOldMeter.");

  const auto veh = co_await db->execSqlCoro(
      "SELECT current_meter_reading::text AS cur, cumulative_meter_reading::text AS cum, primary_meter_unit "
      "FROM fwm_vehicles WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false FOR UPDATE",
      who.tenantId, body["vehicleId"].asString());
  if (veh.empty())
    co_return fail("not_found", "Vehicle not found.");

  // Maintain mathematical cumulative meter continuity across resets (e.g. GR9).
  const long long oldReading = dec6(body["oldMeterReading"].asString());
  const long long newReading = dec6(body["newMeterReading"].asString());
  const long long prevCur = dec6(veh[0]["cur"].as<std::string>());
  const long long prevCum = dec6(veh[0]["cum"].as<std::string>());
  const long long baseOffset = prevCum - prevCur;
  const long long addedOnOld = oldReading > prevCur ? (oldReading - prevCur) : 0;
  const long long newCum = prevCum + addedOnOld;
  const long long newOffsetDelta = (newCum - newReading) - baseOffset;

  const auto saved = co_await db->execSqlCoro(
      "INSERT INTO fwm_meter_changes(tenant_id,vehicle_id,change_date,last_date_on_old_meter,"
      "old_meter_reading,new_meter_reading,replacement_label,engine_changed,meter_stalled,"
      "cumulative_offset_delta,notes,created_by_user_id) "
      "VALUES($1::uuid,$2::uuid,$3::date,$4::date,($5::text)::numeric,($6::text)::numeric,"
      "$7,$8,$9,($10::text)::numeric,$11,$12::uuid) RETURNING id",
      who.tenantId, body["vehicleId"].asString(), body["changeDate"].asString(),
      body["lastDateOnOldMeter"].asString(), body["oldMeterReading"].asString(),
      body["newMeterReading"].asString(), body["replacementLabel"].asString(),
      body["engineChanged"].asBool(), body["meterStalled"].asBool(), dec6str(newOffsetDelta),
      body["notes"].asString(), who.userId);

  co_await db->execSqlCoro(
      "UPDATE fwm_vehicles SET current_meter_reading=($3::text)::numeric,"
      "cumulative_meter_reading=($4::text)::numeric,is_meter_stalled=$5,"
      "stalled_since_date=CASE WHEN $5 THEN $6::date ELSE NULL END,last_meter_log_date=$6::date,"
      "last_modified_at=now(),last_modified_by_user_id=$7::uuid,version=version+1 "
      "WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false",
      who.tenantId, body["vehicleId"].asString(), body["newMeterReading"].asString(),
      dec6str(newCum), body["meterStalled"].asBool(), body["changeDate"].asString(), who.userId);

  co_await db->execSqlCoro(
      "INSERT INTO fwm_meter_readings(tenant_id,vehicle_id,log_date,reading,engine_run_delta,"
      "cumulative_reading,meter_unit,is_stalled_estimate,source,notes,created_by_user_id) "
      "VALUES($1::uuid,$2::uuid,$3::date,($4::text)::numeric,($5::text)::numeric,($6::text)::numeric,"
      "$7,$8,'meter_change',$9,$10::uuid)",
      who.tenantId, body["vehicleId"].asString(), body["changeDate"].asString(),
      body["newMeterReading"].asString(), dec6str(addedOnOld), dec6str(newCum),
      veh[0]["primary_meter_unit"].as<std::string>(), body["meterStalled"].asBool(),
      body["replacementLabel"].asString(), who.userId);

  Json::Value out;
  out["id"] = saved[0]["id"].as<std::string>();
  out["cumulativeMeterReading"] = dec6str(newCum);
  out["currentMeterReading"] = body["newMeterReading"];
  co_return okRecord(out);
}

drogon::Task<dto::BaseApiResponse>
stalledMeters(DbClientPtr db, const std::string &action, const std::string &id, Json::Value body,
              const utils::AuditIdentity &who, bool canWrite) {
  if (action == "list") {
    const auto rows = co_await db->execSqlCoro(
        "SELECT jsonb_build_object('vehicleId',v.id,'assetNo',v.asset_no,"
        "'registrationNo',v.registration_no,'makeModel',v.make_model,"
        "'primaryMeterUnit',v.primary_meter_unit,'currentMeterReading',v.current_meter_reading::text,"
        "'cumulativeMeterReading',v.cumulative_meter_reading::text,"
        "'stalledSinceDate',v.stalled_since_date,'lastMeterLogDate',v.last_meter_log_date)::text AS record "
        "FROM fwm_vehicles v WHERE v.tenant_id=$1 AND v.is_deleted=false AND v.is_meter_stalled=true "
        "ORDER BY v.stalled_since_date NULLS LAST, v.asset_no",
        who.tenantId);
    dto::BaseApiResponse r;
    r.result["data"] = Json::arrayValue;
    for (const auto &row : rows)
      r.result["data"].append(parse(row["record"].as<std::string>()));
    r.result["totalCount"] = Json::UInt64(rows.size());
    r.result["canWrite"] = canWrite;
    r.success = true;
    co_return r;
  }
  if (action != "resolve-stalled-meter" || !uuid(id))
    co_return fail("validation_error", "Valid vehicle UUID required.");
  std::string err;
  if (!allowedFields(body, {"resolvedDate", "newReading", "notes"}, err) ||
      !validDate(body, "resolvedDate", err, true) ||
      !validDec(body, "newReading", err, "0") || !validText(body, "notes", 500, err))
    co_return fail("validation_error", err);
  const auto veh = co_await db->execSqlCoro(
      "SELECT current_meter_reading::text AS cur, cumulative_meter_reading::text AS cum "
      "FROM fwm_vehicles WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false FOR UPDATE",
      who.tenantId, id);
  if (veh.empty())
    co_return fail("not_found", "Vehicle not found.");
  const long long newRead = dec6(body["newReading"].asString());
  const long long oldRead = dec6(veh[0]["cur"].as<std::string>());
  const long long delta = newRead > oldRead ? newRead - oldRead : 0;
  const long long newCum = dec6(veh[0]["cum"].as<std::string>()) + delta;
  co_await db->execSqlCoro(
      "UPDATE fwm_vehicles SET is_meter_stalled=false,stalled_since_date=NULL,"
      "current_meter_reading=($3::text)::numeric,cumulative_meter_reading=($4::text)::numeric,"
      "last_meter_log_date=$5::date,last_modified_at=now(),last_modified_by_user_id=$6::uuid,"
      "version=version+1 WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false",
      who.tenantId, id, body["newReading"].asString(), dec6str(newCum),
      body["resolvedDate"].asString(), who.userId);
  Json::Value out;
  out["vehicleId"] = id;
  out["isMeterStalled"] = false;
  out["currentMeterReading"] = body["newReading"];
  out["cumulativeMeterReading"] = dec6str(newCum);
  co_return okRecord(out);
}

drogon::Task<dto::BaseApiResponse>
meterReadings(DbClientPtr db, const std::string &action, Json::Value body, int page, int size,
              const utils::AuditIdentity &who, bool canWrite) {
  if (action == "list") {
    const std::string vid = body.isObject() && body["vehicleId"].isString()
                                ? lower(trim(body["vehicleId"].asString()))
                                : "";
    const std::string vidScope = uuidOrEmpty(vid);
    const auto cnt = co_await db->execSqlCoro(
        "SELECT count(*) AS total FROM fwm_meter_readings m "
        "WHERE m.tenant_id=$1 AND m.is_deleted=false AND ($2='' OR m.vehicle_id=$2::uuid)",
        who.tenantId, vidScope);
    const auto rows = co_await db->execSqlCoro(
        "SELECT jsonb_build_object('id',m.id,'vehicleId',m.vehicle_id,'assetNo',v.asset_no,"
        "'registrationNo',v.registration_no,'logDate',m.log_date,'reading',m.reading::text,"
        "'engineRunDelta',m.engine_run_delta::text,'cumulativeReading',m.cumulative_reading::text,"
        "'meterUnit',m.meter_unit,'isStalledEstimate',m.is_stalled_estimate,'source',m.source,"
        "'notes',m.notes)::text AS record FROM fwm_meter_readings m "
        "JOIN fwm_vehicles v ON v.tenant_id=m.tenant_id AND v.id=m.vehicle_id AND v.is_deleted=false "
        "WHERE m.tenant_id=$1 AND m.is_deleted=false AND ($2='' OR m.vehicle_id=$2::uuid) "
        "ORDER BY m.log_date DESC, m.created_at DESC LIMIT $3 OFFSET $4",
        who.tenantId, vidScope, size, static_cast<long long>(page - 1) * size);
    dto::BaseApiResponse r;
    r.result["data"] = Json::arrayValue;
    for (const auto &row : rows)
      r.result["data"].append(parse(row["record"].as<std::string>()));
    r.result["totalCount"] = Json::Int64(cnt[0]["total"].as<long long>());
    r.result["canWrite"] = canWrite;
    r.success = true;
    co_return r;
  }
  if (action != "create")
    co_return fail("validation_error", "Unsupported meter-readings action.");
  std::string err;
  if (!allowedFields(body, {"vehicleId", "logDate", "reading", "isStalledEstimate", "source", "notes"},
                     err) ||
      !validUuidOpt(body, "vehicleId", err, true) || !validDate(body, "logDate", err, true) ||
      !validDec(body, "reading", err, "0") || !validBool(body, "isStalledEstimate", err, false) ||
      !validEnum(body, "source", {"manual", "fuel_log", "lubricant_log", "job_card"}, err, "manual") ||
      !validText(body, "notes", 500, err))
    co_return fail("validation_error", err);

  const auto veh = co_await db->execSqlCoro(
      "SELECT current_meter_reading::text AS cur, cumulative_meter_reading::text AS cum, primary_meter_unit "
      "FROM fwm_vehicles WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false FOR UPDATE",
      who.tenantId, body["vehicleId"].asString());
  if (veh.empty())
    co_return fail("not_found", "Vehicle not found.");
  const long long newRead = dec6(body["reading"].asString());
  const long long prevCur = dec6(veh[0]["cur"].as<std::string>());
  if (newRead < prevCur && !body["isStalledEstimate"].asBool())
    co_return fail("conflict",
                   "Reading is below current vehicle meter; log a Meter Change if the odometer/hour-meter was replaced.");
  const long long delta = newRead > prevCur ? (newRead - prevCur) : 0;
  const long long newCum = dec6(veh[0]["cum"].as<std::string>()) + delta;
  const auto saved = co_await db->execSqlCoro(
      "INSERT INTO fwm_meter_readings(tenant_id,vehicle_id,log_date,reading,engine_run_delta,"
      "cumulative_reading,meter_unit,is_stalled_estimate,source,notes,created_by_user_id) "
      "VALUES($1::uuid,$2::uuid,$3::date,($4::text)::numeric,($5::text)::numeric,($6::text)::numeric,"
      "$7,$8,$9,$10,$11::uuid) RETURNING id",
      who.tenantId, body["vehicleId"].asString(), body["logDate"].asString(),
      body["reading"].asString(), dec6str(delta), dec6str(newCum),
      veh[0]["primary_meter_unit"].as<std::string>(), body["isStalledEstimate"].asBool(),
      body["source"].asString(), body["notes"].asString(), who.userId);
  co_await db->execSqlCoro(
      "UPDATE fwm_vehicles SET current_meter_reading=($3::text)::numeric,"
      "cumulative_meter_reading=($4::text)::numeric,last_meter_log_date=$5::date,"
      "is_meter_stalled=CASE WHEN $6 THEN true ELSE is_meter_stalled END,"
      "stalled_since_date=CASE WHEN $6 AND stalled_since_date IS NULL THEN $5::date ELSE stalled_since_date END,"
      "last_modified_at=now(),last_modified_by_user_id=$7::uuid,version=version+1 "
      "WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false",
      who.tenantId, body["vehicleId"].asString(), body["reading"].asString(), dec6str(newCum),
      body["logDate"].asString(), body["isStalledEstimate"].asBool(), who.userId);
  Json::Value out;
  out["id"] = saved[0]["id"].as<std::string>();
  out["engineRunDelta"] = dec6str(delta);
  out["cumulativeReading"] = dec6str(newCum);
  co_return okRecord(out);
}

drogon::Task<dto::BaseApiResponse>
fuelLogs(DbClientPtr db, const std::string &action, const std::string &id, Json::Value body,
         int page, int size, const std::string &query, const std::string &unitId,
         const utils::AuditIdentity &who, bool canWrite) {
  const std::string unit = lower(trim(unitId));
  const char *selectOne = R"(
SELECT jsonb_build_object(
 'id', f.id, 'version', f.version, 'accountingUnitId', f.accounting_unit_id,
 'fuelLogNumber', f.fuel_log_number, 'vehicleId', f.vehicle_id,
 'assetNo', v.asset_no, 'registrationNo', v.registration_no,
 'logDate', f.log_date, 'meterReading', f.meter_reading::text,
 'previousMeterReading', f.previous_meter_reading::text,
 'fuelItemId', f.fuel_item_id, 'uomId', f.uom_id, 'warehouseId', f.warehouse_id,
 'invStockDocumentId', f.inv_stock_document_id, 'journalBatchId', f.journal_batch_id,
 'quantityLitres', f.quantity_litres::text, 'unitCost', f.unit_cost::text,
 'totalCost', f.total_cost::text, 'currencyId', f.currency_id,
 'actualConsumptionRate', f.actual_consumption_rate::text,
 'idealConsumptionRate', f.ideal_consumption_rate::text,
 'variancePct', f.variance_pct::text, 'withinTolerance', f.within_tolerance,
 'stationOrPump', f.station_or_pump, 'driverEmployeeId', f.driver_employee_id,
 'costCenterId', f.cost_center_id, 'supplierId', f.supplier_id,
 'status', f.status, 'notes', f.notes
)::text AS record
FROM fwm_fuel_logs f
JOIN fwm_vehicles v ON v.tenant_id=f.tenant_id AND v.id=f.vehicle_id AND v.is_deleted=false)";

  if (action == "list") {
    const std::string q = search(query);
    const std::string vid = body.isObject() && body["vehicleId"].isString()
                                ? lower(trim(body["vehicleId"].asString()))
                                : "";
    const std::string unitScope = uuidOrEmpty(unit);
    const std::string vidScope = uuidOrEmpty(vid);
    const auto cnt = co_await db->execSqlCoro(
        "SELECT count(*) AS total FROM fwm_fuel_logs f "
        "JOIN fwm_vehicles v ON v.tenant_id=f.tenant_id AND v.id=f.vehicle_id AND v.is_deleted=false "
        "WHERE f.tenant_id=$1 AND f.is_deleted=false AND ($2='' OR f.accounting_unit_id=$2::uuid) "
        "AND ($3='' OR f.vehicle_id=$3::uuid) "
        "AND ($4='' OR strpos(lower(f.fuel_log_number||' '||v.asset_no||' '||v.registration_no||' '||f.station_or_pump),lower($4))>0)",
        who.tenantId, unitScope, vidScope, q);
    const auto rows = co_await db->execSqlCoro(
        std::string(selectOne) +
            " WHERE f.tenant_id=$1 AND f.is_deleted=false AND ($2='' OR f.accounting_unit_id=$2::uuid) "
            "AND ($3='' OR f.vehicle_id=$3::uuid) "
            "AND ($4='' OR strpos(lower(f.fuel_log_number||' '||v.asset_no||' '||v.registration_no||' '||f.station_or_pump),lower($4))>0) "
            "ORDER BY f.log_date DESC, f.created_at DESC LIMIT $5 OFFSET $6",
        who.tenantId, unitScope, vidScope, q, size,
        static_cast<long long>(page - 1) * size);
    dto::BaseApiResponse r;
    r.result["data"] = Json::arrayValue;
    for (const auto &row : rows)
      r.result["data"].append(parse(row["record"].as<std::string>()));
    r.result["totalCount"] = Json::Int64(cnt[0]["total"].as<long long>());
    r.result["canWrite"] = canWrite;
    r.success = true;
    co_return r;
  }
  if (action == "get") {
    if (!uuid(id))
      co_return fail("validation_error", "Valid fuel log UUID required.");
    const auto rows = co_await db->execSqlCoro(
        std::string(selectOne) + " WHERE f.tenant_id=$1 AND f.id=$2::uuid AND f.is_deleted=false",
        who.tenantId, id);
    if (rows.empty())
      co_return fail("not_found", "Fuel log not found.");
    auto out = parse(rows[0]["record"].as<std::string>());
    out["canWrite"] = canWrite;
    co_return okRecord(out);
  }
  if (action == "next-number") {
    if (!uuid(unit))
      co_return fail("validation_error", "accountingUnitId is required.");
    const auto row = co_await db->execSqlCoro(
        "SELECT COALESCE(prefix,'FUL') AS prefix, COALESCE(padding,5) AS padding, COALESCE(next_number,1) AS next_number "
        "FROM fwm_document_sequences WHERE tenant_id=$1 AND accounting_unit_id=$2::uuid AND document_type='fuel_log'",
        who.tenantId, unit);
    std::string prefix = "FUL";
    int pad = 5;
    long long num = 1;
    if (!row.empty()) {
      prefix = row[0]["prefix"].as<std::string>();
      pad = row[0]["padding"].as<int>();
      num = row[0]["next_number"].as<long long>();
    }
    std::string s = std::to_string(num);
    if (static_cast<int>(s.size()) < pad)
      s = std::string(static_cast<size_t>(pad - static_cast<int>(s.size())), '0') + s;
    Json::Value out;
    out["nextNumber"] = prefix + "-" + s;
    co_return okRecord(out);
  }
  if (action == "delete") {
    if (!uuid(id) || !body.isObject() || !body["version"].isInt() || body["version"].asInt() < 1)
      co_return fail("validation_error", "ID and current version required.");
    const auto del = co_await db->execSqlCoro(
        "UPDATE fwm_fuel_logs SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$3::uuid,"
        "version=version+1 WHERE tenant_id=$1 AND id=$2::uuid AND status='draft' AND version=$4 "
        "AND is_deleted=false RETURNING id",
        who.tenantId, id, who.userId, body["version"].asInt());
    if (del.empty())
      co_return fail("conflict", "Only draft fuel logs at current version can be deleted.");
    Json::Value res;
    res["id"] = id;
    res["isDeleted"] = true;
    co_return okRecord(res);
  }
  if (action == "post") {
    if (!uuid(id))
      co_return fail("validation_error", "Valid fuel log UUID required.");
    const auto rows = co_await db->execSqlCoro(
        "SELECT f.id, f.accounting_unit_id, f.fuel_log_number, f.vehicle_id, v.asset_no, "
        "f.log_date::text AS log_date, f.meter_reading::text AS meter_reading, f.fuel_item_id, "
        "f.uom_id, f.warehouse_id, f.quantity_litres::text AS qty, f.unit_cost::text AS uc, "
        "f.total_cost::text AS total_cost, f.currency_id, f.cost_center_id, f.status, f.version, "
        "f.notes, v.use_fuel_log_for_pm, v.current_meter_reading::text AS cur_meter, "
        "v.cumulative_meter_reading::text AS cum_meter, v.primary_meter_unit "
        "FROM fwm_fuel_logs f JOIN fwm_vehicles v ON v.tenant_id=f.tenant_id AND v.id=f.vehicle_id "
        "WHERE f.tenant_id=$1 AND f.id=$2::uuid AND f.is_deleted=false FOR UPDATE OF f",
        who.tenantId, id);
    if (rows.empty())
      co_return fail("not_found", "Fuel log not found.");
    if (rows[0]["status"].as<std::string>() != "draft")
      co_return fail("conflict", "Only draft fuel logs can be posted.");

    const std::string logUnit = rows[0]["accounting_unit_id"].as<std::string>();
    const std::string fuelItemId = optCol(rows[0], "fuel_item_id");
    const std::string uomId = optCol(rows[0], "uom_id");
    const std::string whId = optCol(rows[0], "warehouse_id");
    std::string stockDocId, journalBatchId;

    if (!fuelItemId.empty() && !whId.empty()) {
      std::string resolvedUom = uomId;
      if (resolvedUom.empty()) {
        const auto itemRow = co_await db->execSqlCoro(
            "SELECT base_uom_id FROM inv_items WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false",
            who.tenantId, fuelItemId);
        if (itemRow.empty())
          co_return fail("not_found", "Fuel item not found in Inventory.");
        resolvedUom = itemRow[0]["base_uom_id"].as<std::string>();
      }
      Json::Value stockPayload;
      stockPayload["accountingUnitId"] = logUnit;
      stockPayload["documentType"] = "issue";
      stockPayload["movementReason"] = "internal_use";
      stockPayload["documentDate"] = rows[0]["log_date"].as<std::string>();
      stockPayload["sourceWarehouseId"] = whId;
      if (!rows[0]["cost_center_id"].isNull())
        stockPayload["costCenterId"] = rows[0]["cost_center_id"].as<std::string>();
      stockPayload["referenceNumber"] = rows[0]["fuel_log_number"].as<std::string>();
      stockPayload["notes"] = rows[0]["notes"].as<std::string>();
      stockPayload["requestId"] = id;
      Json::Value line;
      line["itemId"] = fuelItemId;
      line["uomId"] = resolvedUom;
      line["quantity"] = rows[0]["qty"].as<std::string>();
      line["unitCost"] = rows[0]["uc"].as<std::string>();
      line["batchCode"] = "";
      line["description"] = "Fuel issue for " + rows[0]["asset_no"].as<std::string>();
      line["serialNumbers"] = Json::arrayValue;
      stockPayload["lines"] = Json::arrayValue;
      stockPayload["lines"].append(line);
      const auto posted = co_await InventoryService::postStockDocument(db, stockPayload, who);
      if (!posted.success)
        co_return posted;
      stockDocId = posted.result["documentId"].asString();
      journalBatchId = posted.result["journalBatchId"].isNull() ? "" : posted.result["journalBatchId"].asString();

      Json::Value linkPayload;
      linkPayload["fuelLogNumber"] = rows[0]["fuel_log_number"].as<std::string>();
      linkPayload["vehicleId"] = rows[0]["vehicle_id"].as<std::string>();
      linkPayload["stockDocumentNumber"] = posted.result["documentNumber"].asString();
      co_await upsertCrossModuleLink(
          db, who, logUnit, "fuel_log", id, "inventory", "fuel_stock_issue", stockDocId,
          posted.result["documentNumber"].asString(), "posted",
          posted.result["totalValue"].asString(), optCol(rows[0], "currency_id"),
          journalBatchId, linkPayload, "inv_fuel_" + id);
    } else if (body.isObject() && body["creditAccountId"].isString() &&
               uuid(body["creditAccountId"].asString()) && body["periodId"].isString() &&
               uuid(body["periodId"].asString()) && dec6(rows[0]["total_cost"].as<std::string>()) > 0) {
      const auto settings = co_await db->execSqlCoro(
          "SELECT fuel_expense_account_id FROM fwm_gl_settings "
          "WHERE tenant_id=$1 AND accounting_unit_id=$2::uuid AND is_deleted=false",
          who.tenantId, logUnit);
      std::string drAcct =
          (!settings.empty() && !settings[0]["fuel_expense_account_id"].isNull())
              ? settings[0]["fuel_expense_account_id"].as<std::string>()
              : "";
      if (body["debitAccountId"].isString() && uuid(body["debitAccountId"].asString()))
        drAcct = lower(body["debitAccountId"].asString());
      if (drAcct.empty())
        co_return fail("validation_error", "Configure fuelExpenseAccountId or provide debitAccountId.");
      std::string currId =
          rows[0]["currency_id"].isNull() ? "" : rows[0]["currency_id"].as<std::string>();
      if (currId.empty())
        currId = co_await resolveUnitCurrency(db, who, logUnit);
      Json::Value jPayload;
      jPayload["accountingUnitId"] = logUnit;
      jPayload["batchDate"] = rows[0]["log_date"].as<std::string>();
      jPayload["description"] = "Fuel " + rows[0]["fuel_log_number"].as<std::string>() + " - " +
                                rows[0]["asset_no"].as<std::string>();
      jPayload["periodId"] = lower(body["periodId"].asString());
      jPayload["isMultiCurrency"] = false;
      Json::Value dr, cr;
      dr["accountId"] = drAcct;
      dr["currencyId"] = currId;
      dr["exchangeRate"] = "1";
      dr["debit"] = rows[0]["total_cost"].as<std::string>();
      dr["credit"] = "0";
      dr["description"] = jPayload["description"];
      dr["referenceNumber"] = rows[0]["fuel_log_number"].as<std::string>();
      dr["transactionDate"] = rows[0]["log_date"].as<std::string>();
      if (!rows[0]["cost_center_id"].isNull())
        dr["costCenterId"] = rows[0]["cost_center_id"].as<std::string>();
      cr = dr;
      cr["accountId"] = lower(body["creditAccountId"].asString());
      cr["debit"] = "0";
      cr["credit"] = rows[0]["total_cost"].as<std::string>();
      jPayload["lines"] = Json::arrayValue;
      jPayload["lines"].append(dr);
      jPayload["lines"].append(cr);
      const auto jPosted = co_await JournalService::createAndPost(db, jPayload, who);
      if (!jPosted.success)
        co_return jPosted;
      journalBatchId = jPosted.result["id"].asString();
      co_await upsertCrossModuleLink(
          db, who, logUnit, "fuel_log", id, "gl", "fuel_expense_journal", journalBatchId,
          jPosted.result["batchNumber"].asString(), "posted", rows[0]["total_cost"].as<std::string>(),
          currId, journalBatchId, jPayload, "gl_fuel_" + id);
    }

    if (rows[0]["use_fuel_log_for_pm"].as<bool>()) {
      const long long mr = dec6(rows[0]["meter_reading"].as<std::string>());
      const long long cur = dec6(rows[0]["cur_meter"].as<std::string>());
      if (mr > cur) {
        const long long delta = mr - cur;
        const long long cum = dec6(rows[0]["cum_meter"].as<std::string>()) + delta;
        co_await db->execSqlCoro(
            "UPDATE fwm_vehicles SET current_meter_reading=($3::text)::numeric,"
            "cumulative_meter_reading=($4::text)::numeric,last_meter_log_date=$5::date,"
            "last_modified_at=now(),last_modified_by_user_id=$6::uuid,version=version+1 "
            "WHERE tenant_id=$1 AND id=$2::uuid",
            who.tenantId, rows[0]["vehicle_id"].as<std::string>(), rows[0]["meter_reading"].as<std::string>(),
            dec6str(cum), rows[0]["log_date"].as<std::string>(), who.userId);
      }
    }

    co_await db->execSqlCoro(
        "UPDATE fwm_fuel_logs SET status='posted',inv_stock_document_id=NULLIF($3,'')::uuid,"
        "journal_batch_id=NULLIF($4,'')::uuid,posted_at=now(),posted_by_user_id=$5::uuid,"
        "version=version+1,last_modified_at=now(),last_modified_by_user_id=$5::uuid "
        "WHERE tenant_id=$1 AND id=$2::uuid AND status='draft'",
        who.tenantId, id, stockDocId, journalBatchId, who.userId);
    const auto out = co_await db->execSqlCoro(
        std::string(selectOne) + " WHERE f.tenant_id=$1 AND f.id=$2::uuid AND f.is_deleted=false",
        who.tenantId, id);
    co_return okRecord(parse(out[0]["record"].as<std::string>()));
  }
  if (action == "reverse") {
    if (!uuid(id))
      co_return fail("validation_error", "Valid fuel log UUID required.");
    const std::string reason =
        body.isObject() && body["reason"].isString() ? trim(body["reason"].asString()) : "Reversed";
    const auto rows = co_await db->execSqlCoro(
        "SELECT status, inv_stock_document_id FROM fwm_fuel_logs "
        "WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false FOR UPDATE",
        who.tenantId, id);
    if (rows.empty())
      co_return fail("not_found", "Fuel log not found.");
    if (rows[0]["status"].as<std::string>() != "posted")
      co_return fail("conflict", "Only posted fuel logs can be reversed.");
    if (!rows[0]["inv_stock_document_id"].isNull()) {
      const auto rev = co_await InventoryService::reverseStockDocument(
          db, rows[0]["inv_stock_document_id"].as<std::string>(), reason, who);
      if (!rev.success)
        co_return rev;
    }
    co_await db->execSqlCoro(
        "UPDATE fwm_fuel_logs SET status='reversed',version=version+1,"
        "last_modified_at=now(),last_modified_by_user_id=$3::uuid WHERE tenant_id=$1 AND id=$2::uuid",
        who.tenantId, id, who.userId);
    const auto out = co_await db->execSqlCoro(
        std::string(selectOne) + " WHERE f.tenant_id=$1 AND f.id=$2::uuid AND f.is_deleted=false",
        who.tenantId, id);
    co_return okRecord(parse(out[0]["record"].as<std::string>()));
  }
  if (action != "create" && action != "update")
    co_return fail("validation_error", "Unsupported fuel-logs action.");
  const bool isUpdate = action == "update";
  if (isUpdate && !uuid(id))
    co_return fail("validation_error", "Valid fuel log UUID required.");

  std::string err;
  std::set<std::string> allowed{"accountingUnitId", "vehicleId", "logDate", "meterReading",
                                "fuelItemId", "uomId", "warehouseId", "quantityLitres", "unitCost",
                                "totalCost", "currencyId", "stationOrPump", "driverEmployeeId",
                                "costCenterId", "supplierId", "notes", "requestId"};
  if (isUpdate)
    allowed.insert("version");
  if (!allowedFields(body, allowed, err))
    co_return fail("validation_error", err);
  if (isUpdate && (!body["version"].isInt() || body["version"].asInt() < 1))
    co_return fail("validation_error", "A valid version is required.");
  if (!validUuidOpt(body, "accountingUnitId", err, !isUpdate) ||
      !validUuidOpt(body, "vehicleId", err, true) ||
      !validDate(body, "logDate", err, true) ||
      !validDec(body, "meterReading", err, "0") ||
      !validUuidOpt(body, "fuelItemId", err) ||
      !validUuidOpt(body, "uomId", err) ||
      !validUuidOpt(body, "warehouseId", err) ||
      !validDec(body, "quantityLitres", err, "0", true) ||
      !validDec(body, "unitCost", err, "0") ||
      !validDec(body, "totalCost", err, "0") ||
      !validUuidOpt(body, "currencyId", err) ||
      !validText(body, "stationOrPump", 120, err) ||
      !validUuidOpt(body, "driverEmployeeId", err) ||
      !validUuidOpt(body, "costCenterId", err) ||
      !validUuidOpt(body, "supplierId", err) ||
      !validText(body, "notes", 500, err) ||
      !validUuidOpt(body, "requestId", err))
    co_return fail("validation_error", err);

  const auto veh = co_await db->execSqlCoro(
      "SELECT accounting_unit_id, current_meter_reading::text AS cur, "
      "track_fuel_consumption, ideal_consumption_rate::text AS ideal, consumption_unit, "
      "tolerance_below_pct::text AS tol_lo, tolerance_above_pct::text AS tol_hi "
      "FROM fwm_vehicles WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false FOR SHARE",
      who.tenantId, body["vehicleId"].asString());
  if (veh.empty())
    co_return fail("not_found", "Vehicle not found.");
  const std::string effUnit =
      body["accountingUnitId"].isNull() ? veh[0]["accounting_unit_id"].as<std::string>()
                                        : body["accountingUnitId"].asString();
  if (body["currencyId"].isNull()) {
    const auto cu = co_await resolveUnitCurrency(db, who, effUnit);
    if (!cu.empty())
      body["currencyId"] = cu;
  }

  // Compute total cost if omitted.
  if (dec6(body["totalCost"].asString()) == 0 && dec6(body["unitCost"].asString()) > 0)
    body["totalCost"] = mulDec6(body["quantityLitres"].asString(), body["unitCost"].asString());

  // Compute fuel consumption rate & tolerance flag (Mcguan Fuel Consumption Tolerances).
  const std::string prevMeterStr = veh[0]["cur"].as<std::string>();
  const long double prevMeter = std::stold(prevMeterStr);
  const long double curMeter = std::stold(body["meterReading"].asString());
  const long double litres = std::stold(body["quantityLitres"].asString());
  const long double ideal = std::stold(veh[0]["ideal"].as<std::string>());
  const std::string cUnit = veh[0]["consumption_unit"].as<std::string>();
  long double actualRate = 0;
  if (curMeter > prevMeter && litres > 0) {
    const long double delta = curMeter - prevMeter;
    if (cUnit == "litres_per_100km")
      actualRate = (litres / delta) * 100.0L;
    else if (cUnit == "km_per_litre")
      actualRate = delta / litres;
    else
      actualRate = litres / delta;
  }
  long double variancePct = 0;
  bool withinTol = true;
  if (veh[0]["track_fuel_consumption"].as<bool>() && ideal > 0 && actualRate > 0) {
    variancePct = ((actualRate - ideal) / ideal) * 100.0L;
    const long double tolLo = std::stold(veh[0]["tol_lo"].as<std::string>());
    const long double tolHi = std::stold(veh[0]["tol_hi"].as<std::string>());
    withinTol = (variancePct >= -tolLo && variancePct <= tolHi);
  }
  const auto fmt6 = [](long double v) {
    char buf[48];
    std::snprintf(buf, sizeof buf, "%.6Lf", v);
    return std::string(buf);
  };

  if (!isUpdate) {
    const std::string num = co_await nextNumber(db, who, effUnit, "fuel_log", "FUL");
    const auto saved = co_await db->execSqlCoro(
        "INSERT INTO fwm_fuel_logs(tenant_id,accounting_unit_id,fuel_log_number,vehicle_id,"
        "log_date,meter_reading,previous_meter_reading,fuel_item_id,uom_id,warehouse_id,"
        "quantity_litres,unit_cost,total_cost,currency_id,actual_consumption_rate,"
        "ideal_consumption_rate,variance_pct,within_tolerance,station_or_pump,driver_employee_id,"
        "cost_center_id,supplier_id,notes,request_key,created_by_user_id) "
        "VALUES($1::uuid,$2::uuid,$3,$4::uuid,$5::date,($6::text)::numeric,($7::text)::numeric,"
        "NULLIF($8,'')::uuid,NULLIF($9,'')::uuid,NULLIF($10,'')::uuid,($11::text)::numeric,"
        "($12::text)::numeric,($13::text)::numeric,NULLIF($14,'')::uuid,($15::text)::numeric,"
        "($16::text)::numeric,($17::text)::numeric,$18,$19,NULLIF($20,'')::uuid,"
        "NULLIF($21,'')::uuid,NULLIF($22,'')::uuid,$23,NULLIF($24,'')::uuid,$25::uuid) RETURNING id",
        who.tenantId, effUnit, num, body["vehicleId"].asString(), body["logDate"].asString(),
        body["meterReading"].asString(), prevMeterStr,
        optStr(body, "fuelItemId"), optStr(body, "uomId"), optStr(body, "warehouseId"),
        body["quantityLitres"].asString(), body["unitCost"].asString(), body["totalCost"].asString(),
        optStr(body, "currencyId"), fmt6(actualRate),
        veh[0]["ideal"].as<std::string>(), fmt6(variancePct), withinTol,
        body["stationOrPump"].asString(),
        optStr(body, "driverEmployeeId"), optStr(body, "costCenterId"), optStr(body, "supplierId"),
        body["notes"].asString(), optStr(body, "requestId"), who.userId);
    const auto out = co_await db->execSqlCoro(
        std::string(selectOne) + " WHERE f.tenant_id=$1 AND f.id=$2::uuid AND f.is_deleted=false",
        who.tenantId, saved[0]["id"].as<std::string>());
    co_return okRecord(parse(out[0]["record"].as<std::string>()));
  }
  const auto updated = co_await db->execSqlCoro(
      "UPDATE fwm_fuel_logs SET log_date=$3::date,meter_reading=($4::text)::numeric,"
      "fuel_item_id=NULLIF($5,'')::uuid,uom_id=NULLIF($6,'')::uuid,warehouse_id=NULLIF($7,'')::uuid,"
      "quantity_litres=($8::text)::numeric,unit_cost=($9::text)::numeric,total_cost=($10::text)::numeric,"
      "actual_consumption_rate=($11::text)::numeric,variance_pct=($12::text)::numeric,"
      "within_tolerance=$13,station_or_pump=$14,driver_employee_id=NULLIF($15,'')::uuid,"
      "cost_center_id=NULLIF($16,'')::uuid,supplier_id=NULLIF($17,'')::uuid,notes=$18,"
      "last_modified_at=now(),last_modified_by_user_id=$19::uuid,version=version+1 "
      "WHERE tenant_id=$1 AND id=$2::uuid AND status='draft' AND version=$20 AND is_deleted=false RETURNING id",
      who.tenantId, id, body["logDate"].asString(), body["meterReading"].asString(),
      optStr(body, "fuelItemId"), optStr(body, "uomId"), optStr(body, "warehouseId"),
      body["quantityLitres"].asString(), body["unitCost"].asString(), body["totalCost"].asString(),
      fmt6(actualRate), fmt6(variancePct), withinTol, body["stationOrPump"].asString(),
      optStr(body, "driverEmployeeId"), optStr(body, "costCenterId"), optStr(body, "supplierId"),
      body["notes"].asString(), who.userId, body["version"].asInt());
  if (updated.empty())
    co_return fail("conflict", "Only draft fuel logs at current version can be edited.");
  const auto out = co_await db->execSqlCoro(
      std::string(selectOne) + " WHERE f.tenant_id=$1 AND f.id=$2::uuid AND f.is_deleted=false",
      who.tenantId, id);
  co_return okRecord(parse(out[0]["record"].as<std::string>()));
}

drogon::Task<dto::BaseApiResponse>
fuelTolerances(DbClientPtr db, const utils::AuditIdentity &who, int page, int size, bool canWrite) {
  const auto cnt = co_await db->execSqlCoro(
      "SELECT count(*) AS total FROM fwm_fuel_logs WHERE tenant_id=$1 AND is_deleted=false "
      "AND within_tolerance=false",
      who.tenantId);
  const auto rows = co_await db->execSqlCoro(
      "SELECT jsonb_build_object('id',f.id,'fuelLogNumber',f.fuel_log_number,'vehicleId',f.vehicle_id,"
      "'assetNo',v.asset_no,'registrationNo',v.registration_no,'logDate',f.log_date,"
      "'quantityLitres',f.quantity_litres::text,'actualRate',f.actual_consumption_rate::text,"
      "'idealRate',f.ideal_consumption_rate::text,'variancePct',f.variance_pct::text,"
      "'consumptionUnit',v.consumption_unit,'toleranceBelowPct',v.tolerance_below_pct::text,"
      "'toleranceAbovePct',v.tolerance_above_pct::text,'stationOrPump',f.station_or_pump)::text AS record "
      "FROM fwm_fuel_logs f JOIN fwm_vehicles v ON v.tenant_id=f.tenant_id AND v.id=f.vehicle_id "
      "WHERE f.tenant_id=$1 AND f.is_deleted=false AND f.within_tolerance=false "
      "ORDER BY abs(f.variance_pct) DESC, f.log_date DESC LIMIT $2 OFFSET $3",
      who.tenantId, size, static_cast<long long>(page - 1) * size);
  dto::BaseApiResponse r;
  r.result["data"] = Json::arrayValue;
  for (const auto &row : rows)
    r.result["data"].append(parse(row["record"].as<std::string>()));
  r.result["totalCount"] = Json::Int64(cnt[0]["total"].as<long long>());
  r.result["canWrite"] = canWrite;
  r.success = true;
  co_return r;
}

drogon::Task<dto::BaseApiResponse>
lubricantLogs(DbClientPtr db, const std::string &action, const std::string &id, Json::Value body,
              int page, int size, const std::string &query, const std::string &unitId,
              const utils::AuditIdentity &who, bool canWrite) {
  const std::string unit = lower(trim(unitId));
  const char *selectOne = R"(
SELECT jsonb_build_object(
 'id', l.id, 'version', l.version, 'accountingUnitId', l.accounting_unit_id,
 'lubricantLogNumber', l.lubricant_log_number, 'vehicleId', l.vehicle_id,
 'assetNo', v.asset_no, 'registrationNo', v.registration_no,
 'logDate', l.log_date, 'meterReading', l.meter_reading::text,
 'lubricantType', l.lubricant_type, 'itemId', l.item_id, 'uomId', l.uom_id,
 'warehouseId', l.warehouse_id, 'invStockDocumentId', l.inv_stock_document_id,
 'journalBatchId', l.journal_batch_id, 'quantity', l.quantity::text,
 'unitCost', l.unit_cost::text, 'totalCost', l.total_cost::text,
 'currencyId', l.currency_id, 'isOilChange', l.is_oil_change,
 'costCenterId', l.cost_center_id, 'status', l.status, 'notes', l.notes
)::text AS record
FROM fwm_lubricant_logs l
JOIN fwm_vehicles v ON v.tenant_id=l.tenant_id AND v.id=l.vehicle_id AND v.is_deleted=false)";

  if (action == "list") {
    const std::string q = search(query);
    const std::string unitScope = uuidOrEmpty(unit);
    const auto cnt = co_await db->execSqlCoro(
        "SELECT count(*) AS total FROM fwm_lubricant_logs l "
        "JOIN fwm_vehicles v ON v.tenant_id=l.tenant_id AND v.id=l.vehicle_id AND v.is_deleted=false "
        "WHERE l.tenant_id=$1 AND l.is_deleted=false AND ($2='' OR l.accounting_unit_id=$2::uuid) "
        "AND ($3='' OR strpos(lower(l.lubricant_log_number||' '||v.asset_no||' '||v.registration_no||' '||l.lubricant_type),lower($3))>0)",
        who.tenantId, unitScope, q);
    const auto rows = co_await db->execSqlCoro(
        std::string(selectOne) +
            " WHERE l.tenant_id=$1 AND l.is_deleted=false AND ($2='' OR l.accounting_unit_id=$2::uuid) "
            "AND ($3='' OR strpos(lower(l.lubricant_log_number||' '||v.asset_no||' '||v.registration_no||' '||l.lubricant_type),lower($3))>0) "
            "ORDER BY l.log_date DESC, l.created_at DESC LIMIT $4 OFFSET $5",
        who.tenantId, unitScope, q, size, static_cast<long long>(page - 1) * size);
    dto::BaseApiResponse r;
    r.result["data"] = Json::arrayValue;
    for (const auto &row : rows)
      r.result["data"].append(parse(row["record"].as<std::string>()));
    r.result["totalCount"] = Json::Int64(cnt[0]["total"].as<long long>());
    r.result["canWrite"] = canWrite;
    r.success = true;
    co_return r;
  }
  if (action == "get") {
    if (!uuid(id))
      co_return fail("validation_error", "Valid lubricant log UUID required.");
    const auto rows = co_await db->execSqlCoro(
        std::string(selectOne) + " WHERE l.tenant_id=$1 AND l.id=$2::uuid AND l.is_deleted=false",
        who.tenantId, id);
    if (rows.empty())
      co_return fail("not_found", "Lubricant log not found.");
    auto out = parse(rows[0]["record"].as<std::string>());
    out["canWrite"] = canWrite;
    co_return okRecord(out);
  }
  if (action == "next-number") {
    if (!uuid(unit))
      co_return fail("validation_error", "accountingUnitId is required.");
    const auto row = co_await db->execSqlCoro(
        "SELECT COALESCE(prefix,'LUB') AS prefix, COALESCE(padding,5) AS padding, COALESCE(next_number,1) AS next_number "
        "FROM fwm_document_sequences WHERE tenant_id=$1 AND accounting_unit_id=$2::uuid AND document_type='lubricant_log'",
        who.tenantId, unit);
    std::string prefix = "LUB";
    int pad = 5;
    long long num = 1;
    if (!row.empty()) {
      prefix = row[0]["prefix"].as<std::string>();
      pad = row[0]["padding"].as<int>();
      num = row[0]["next_number"].as<long long>();
    }
    std::string s = std::to_string(num);
    if (static_cast<int>(s.size()) < pad)
      s = std::string(static_cast<size_t>(pad - static_cast<int>(s.size())), '0') + s;
    Json::Value out;
    out["nextNumber"] = prefix + "-" + s;
    co_return okRecord(out);
  }
  if (action == "delete") {
    if (!uuid(id) || !body.isObject() || !body["version"].isInt() || body["version"].asInt() < 1)
      co_return fail("validation_error", "ID and version required.");
    const auto del = co_await db->execSqlCoro(
        "UPDATE fwm_lubricant_logs SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$3::uuid,"
        "version=version+1 WHERE tenant_id=$1 AND id=$2::uuid AND status='draft' AND version=$4 "
        "AND is_deleted=false RETURNING id",
        who.tenantId, id, who.userId, body["version"].asInt());
    if (del.empty())
      co_return fail("conflict", "Only draft lubricant logs at current version can be deleted.");
    Json::Value res;
    res["id"] = id;
    res["isDeleted"] = true;
    co_return okRecord(res);
  }
  if (action == "post") {
    if (!uuid(id))
      co_return fail("validation_error", "Valid lubricant log UUID required.");
    const auto rows = co_await db->execSqlCoro(
        "SELECT l.id, l.accounting_unit_id, l.lubricant_log_number, l.vehicle_id, v.asset_no, "
        "l.log_date::text AS log_date, l.item_id, l.uom_id, l.warehouse_id, l.quantity::text AS qty, "
        "l.unit_cost::text AS uc, l.total_cost::text AS total_cost, l.currency_id, l.cost_center_id, "
        "l.status, l.notes FROM fwm_lubricant_logs l "
        "JOIN fwm_vehicles v ON v.tenant_id=l.tenant_id AND v.id=l.vehicle_id "
        "WHERE l.tenant_id=$1 AND l.id=$2::uuid AND l.is_deleted=false FOR UPDATE OF l",
        who.tenantId, id);
    if (rows.empty())
      co_return fail("not_found", "Lubricant log not found.");
    if (rows[0]["status"].as<std::string>() != "draft")
      co_return fail("conflict", "Only draft lubricant logs can be posted.");
    std::string stockDocId, journalBatchId;
    const std::string itemId = optCol(rows[0], "item_id");
    const std::string whId = optCol(rows[0], "warehouse_id");
    if (!itemId.empty() && !whId.empty()) {
      std::string resolvedUom = optCol(rows[0], "uom_id");
      if (resolvedUom.empty()) {
        const auto itemRow = co_await db->execSqlCoro(
            "SELECT base_uom_id FROM inv_items WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false",
            who.tenantId, itemId);
        if (itemRow.empty())
          co_return fail("not_found", "Lubricant item not found in Inventory.");
        resolvedUom = itemRow[0]["base_uom_id"].as<std::string>();
      }
      Json::Value stockPayload;
      stockPayload["accountingUnitId"] = rows[0]["accounting_unit_id"].as<std::string>();
      stockPayload["documentType"] = "issue";
      stockPayload["movementReason"] = "internal_use";
      stockPayload["documentDate"] = rows[0]["log_date"].as<std::string>();
      stockPayload["sourceWarehouseId"] = whId;
      if (!rows[0]["cost_center_id"].isNull())
        stockPayload["costCenterId"] = rows[0]["cost_center_id"].as<std::string>();
      stockPayload["referenceNumber"] = rows[0]["lubricant_log_number"].as<std::string>();
      stockPayload["notes"] = rows[0]["notes"].as<std::string>();
      stockPayload["requestId"] = id;
      Json::Value line;
      line["itemId"] = itemId;
      line["uomId"] = resolvedUom;
      line["quantity"] = rows[0]["qty"].as<std::string>();
      line["unitCost"] = rows[0]["uc"].as<std::string>();
      line["batchCode"] = "";
      line["description"] = "Lubricant issue for " + rows[0]["asset_no"].as<std::string>();
      line["serialNumbers"] = Json::arrayValue;
      stockPayload["lines"] = Json::arrayValue;
      stockPayload["lines"].append(line);
      const auto posted = co_await InventoryService::postStockDocument(db, stockPayload, who);
      if (!posted.success)
        co_return posted;
      stockDocId = posted.result["documentId"].asString();
      journalBatchId = posted.result["journalBatchId"].isNull() ? "" : posted.result["journalBatchId"].asString();
      co_await upsertCrossModuleLink(
          db, who, rows[0]["accounting_unit_id"].as<std::string>(), "lubricant_log", id,
          "inventory", "lubricant_stock_issue", stockDocId,
          posted.result["documentNumber"].asString(), "posted",
          posted.result["totalValue"].asString(), optCol(rows[0], "currency_id"),
          journalBatchId, stockPayload, "inv_lub_" + id);
    }
    co_await db->execSqlCoro(
        "UPDATE fwm_lubricant_logs SET status='posted',inv_stock_document_id=NULLIF($3,'')::uuid,"
        "journal_batch_id=NULLIF($4,'')::uuid,posted_at=now(),posted_by_user_id=$5::uuid,"
        "version=version+1,last_modified_at=now(),last_modified_by_user_id=$5::uuid "
        "WHERE tenant_id=$1 AND id=$2::uuid AND status='draft'",
        who.tenantId, id, stockDocId, journalBatchId, who.userId);
    const auto out = co_await db->execSqlCoro(
        std::string(selectOne) + " WHERE l.tenant_id=$1 AND l.id=$2::uuid AND l.is_deleted=false",
        who.tenantId, id);
    co_return okRecord(parse(out[0]["record"].as<std::string>()));
  }
  if (action == "reverse") {
    if (!uuid(id))
      co_return fail("validation_error", "Valid lubricant log UUID required.");
    const auto rows = co_await db->execSqlCoro(
        "SELECT status, inv_stock_document_id FROM fwm_lubricant_logs "
        "WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false FOR UPDATE",
        who.tenantId, id);
    if (rows.empty())
      co_return fail("not_found", "Lubricant log not found.");
    if (rows[0]["status"].as<std::string>() != "posted")
      co_return fail("conflict", "Only posted lubricant logs can be reversed.");
    if (!rows[0]["inv_stock_document_id"].isNull()) {
      const auto rev = co_await InventoryService::reverseStockDocument(
          db, rows[0]["inv_stock_document_id"].as<std::string>(), "Reversed lubricant log", who);
      if (!rev.success)
        co_return rev;
    }
    co_await db->execSqlCoro(
        "UPDATE fwm_lubricant_logs SET status='reversed',version=version+1,"
        "last_modified_at=now(),last_modified_by_user_id=$3::uuid WHERE tenant_id=$1 AND id=$2::uuid",
        who.tenantId, id, who.userId);
    const auto out = co_await db->execSqlCoro(
        std::string(selectOne) + " WHERE l.tenant_id=$1 AND l.id=$2::uuid AND l.is_deleted=false",
        who.tenantId, id);
    co_return okRecord(parse(out[0]["record"].as<std::string>()));
  }
  if (action != "create")
    co_return fail("validation_error", "Unsupported lubricant-logs action.");
  std::string err;
  if (!allowedFields(body, {"accountingUnitId", "vehicleId", "logDate", "meterReading",
                            "lubricantType", "itemId", "uomId", "warehouseId", "quantity",
                            "unitCost", "totalCost", "currencyId", "isOilChange", "costCenterId",
                            "notes", "requestId"},
                     err) ||
      !validUuidOpt(body, "accountingUnitId", err, false) ||
      !validUuidOpt(body, "vehicleId", err, true) || !validDate(body, "logDate", err, true) ||
      !validDec(body, "meterReading", err, "0") ||
      !validEnum(body, "lubricantType",
                 {"engine_oil", "hydraulic_oil", "transmission_oil", "gear_oil", "coolant",
                  "grease", "brake_fluid", "other"},
                 err, "engine_oil") ||
      !validUuidOpt(body, "itemId", err) || !validUuidOpt(body, "uomId", err) ||
      !validUuidOpt(body, "warehouseId", err) || !validDec(body, "quantity", err, "0", true) ||
      !validDec(body, "unitCost", err, "0") || !validDec(body, "totalCost", err, "0") ||
      !validUuidOpt(body, "currencyId", err) || !validBool(body, "isOilChange", err, false) ||
      !validUuidOpt(body, "costCenterId", err) || !validText(body, "notes", 500, err) ||
      !validUuidOpt(body, "requestId", err))
    co_return fail("validation_error", err);

  const auto veh = co_await db->execSqlCoro(
      "SELECT accounting_unit_id FROM fwm_vehicles WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false FOR SHARE",
      who.tenantId, body["vehicleId"].asString());
  if (veh.empty())
    co_return fail("not_found", "Vehicle not found.");
  const std::string effUnit = body["accountingUnitId"].isNull()
                                  ? veh[0]["accounting_unit_id"].as<std::string>()
                                  : body["accountingUnitId"].asString();
  if (dec6(body["totalCost"].asString()) == 0 && dec6(body["unitCost"].asString()) > 0)
    body["totalCost"] = mulDec6(body["quantity"].asString(), body["unitCost"].asString());
  const std::string num = co_await nextNumber(db, who, effUnit, "lubricant_log", "LUB");
  const auto saved = co_await db->execSqlCoro(
      "INSERT INTO fwm_lubricant_logs(tenant_id,accounting_unit_id,lubricant_log_number,vehicle_id,"
      "log_date,meter_reading,lubricant_type,item_id,uom_id,warehouse_id,quantity,unit_cost,"
      "total_cost,currency_id,is_oil_change,cost_center_id,notes,request_key,created_by_user_id) "
      "VALUES($1::uuid,$2::uuid,$3,$4::uuid,$5::date,($6::text)::numeric,$7,NULLIF($8,'')::uuid,"
      "NULLIF($9,'')::uuid,NULLIF($10,'')::uuid,($11::text)::numeric,($12::text)::numeric,"
      "($13::text)::numeric,NULLIF($14,'')::uuid,$15,NULLIF($16,'')::uuid,$17,NULLIF($18,'')::uuid,$19::uuid) RETURNING id",
      who.tenantId, effUnit, num, body["vehicleId"].asString(), body["logDate"].asString(),
      body["meterReading"].asString(), body["lubricantType"].asString(),
      optStr(body, "itemId"), optStr(body, "uomId"), optStr(body, "warehouseId"),
      body["quantity"].asString(), body["unitCost"].asString(), body["totalCost"].asString(),
      optStr(body, "currencyId"), body["isOilChange"].asBool(),
      optStr(body, "costCenterId"), body["notes"].asString(), optStr(body, "requestId"),
      who.userId);
  const auto out = co_await db->execSqlCoro(
      std::string(selectOne) + " WHERE l.tenant_id=$1 AND l.id=$2::uuid AND l.is_deleted=false",
      who.tenantId, saved[0]["id"].as<std::string>());
  co_return okRecord(parse(out[0]["record"].as<std::string>()));
}

drogon::Task<dto::BaseApiResponse>
fetchMajorComponent(DbClientPtr db, const utils::AuditIdentity &who, bool canWrite,
                    const char *selectOne, const std::string &cid) {
  const auto rows = co_await db->execSqlCoro(
      std::string(selectOne) + " WHERE c.tenant_id=$1 AND c.id=$2::uuid AND c.is_deleted=false",
      who.tenantId, cid);
  if (rows.empty())
    co_return fail("not_found", "Major component not found.");
  auto out = parse(rows[0]["record"].as<std::string>());
  const auto ev = co_await db->execSqlCoro(
      "SELECT jsonb_build_object('id',e.id,'vehicleId',e.vehicle_id,'eventType',e.event_type,"
      "'eventDate',e.event_date,'cumOdoReading',e.cum_odo_reading::text,'condition',e.condition,"
      "'scrapped',e.scrapped,'repairCost',e.repair_cost::text,'jobCardId',e.job_card_id,"
      "'notes',e.notes,'version',e.version)::text AS record FROM fwm_component_events e "
      "WHERE e.tenant_id=$1 AND e.component_id=$2::uuid AND e.is_deleted=false ORDER BY e.version",
      who.tenantId, cid);
  out["history"] = Json::arrayValue;
  for (const auto &row : ev)
    out["history"].append(parse(row["record"].as<std::string>()));
  out["canWrite"] = canWrite;
  co_return okRecord(out);
}

drogon::Task<dto::BaseApiResponse>
majorComponents(DbClientPtr db, const std::string &action, const std::string &id, Json::Value body,
                int page, int size, const std::string &query, const utils::AuditIdentity &who,
                bool canWrite) {
  const char *selectOne = R"(
SELECT jsonb_build_object(
 'id', c.id, 'version', c.version, 'componentCode', c.component_code, 'serialNo', c.serial_no,
 'componentType', c.component_type, 'description', c.description, 'manufacturer', c.manufacturer,
 'condition', c.condition, 'status', c.status, 'currentVehicleId', c.current_vehicle_id,
 'assetNo', COALESCE(v.asset_no,''), 'registrationNo', COALESCE(v.registration_no,''),
 'mountedDate', c.mounted_date, 'mountedCumOdo', c.mounted_cum_odo::text,
 'estimatedLifeHours', c.estimated_life_hours::text, 'accumulatedHours', c.accumulated_hours::text,
 'purchaseCost', c.purchase_cost::text, 'cumulativeRepairCost', c.cumulative_repair_cost::text,
 'invItemId', c.inv_item_id, 'invSerialId', c.inv_serial_id, 'notes', c.notes
)::text AS record
FROM fwm_major_components c
LEFT JOIN fwm_vehicles v ON v.tenant_id=c.tenant_id AND v.id=c.current_vehicle_id AND v.is_deleted=false)";

  if (action == "list") {
    const std::string q = search(query);
    const std::string status = body.isObject() && body["status"].isString() ? trim(body["status"].asString()) : "";
    const auto cnt = co_await db->execSqlCoro(
        "SELECT count(*) AS total FROM fwm_major_components WHERE tenant_id=$1 AND is_deleted=false "
        "AND ($2='' OR status=$2) AND ($3='' OR strpos(lower(component_code||' '||serial_no||' '||component_type||' '||description),lower($3))>0)",
        who.tenantId, status, q);
    const auto rows = co_await db->execSqlCoro(
        std::string(selectOne) +
            " WHERE c.tenant_id=$1 AND c.is_deleted=false AND ($2='' OR c.status=$2) "
            "AND ($3='' OR strpos(lower(c.component_code||' '||c.serial_no||' '||c.component_type||' '||c.description),lower($3))>0) "
            "ORDER BY lower(c.component_type), lower(c.component_code) LIMIT $4 OFFSET $5",
        who.tenantId, status, q, size, static_cast<long long>(page - 1) * size);
    dto::BaseApiResponse r;
    r.result["data"] = Json::arrayValue;
    for (const auto &row : rows)
      r.result["data"].append(parse(row["record"].as<std::string>()));
    r.result["totalCount"] = Json::Int64(cnt[0]["total"].as<long long>());
    r.result["canWrite"] = canWrite;
    r.success = true;
    co_return r;
  }
  if (action == "get") {
    if (!uuid(id))
      co_return fail("validation_error", "Valid component UUID required.");
    co_return co_await fetchMajorComponent(db, who, canWrite, selectOne, id);
  }
  if (action == "delete") {
    if (!uuid(id) || !body.isObject() || !body["version"].isInt() || body["version"].asInt() < 1)
      co_return fail("validation_error", "ID and version required.");
    const auto del = co_await db->execSqlCoro(
        "UPDATE fwm_major_components SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$3::uuid,"
        "version=version+1 WHERE tenant_id=$1 AND id=$2::uuid AND status='unassigned' AND version=$4 "
        "AND is_deleted=false RETURNING id",
        who.tenantId, id, who.userId, body["version"].asInt());
    if (del.empty())
      co_return fail("conflict", "Only unassigned major components at current version can be deleted.");
    Json::Value res;
    res["id"] = id;
    res["isDeleted"] = true;
    co_return okRecord(res);
  }
  if (action == "mount" || action == "remove" || action == "repair" || action == "scrap") {
    if (!uuid(id))
      co_return fail("validation_error", "Valid component UUID required.");
    std::string err;
    if (!allowedFields(body, {"vehicleId", "eventDate", "cumOdoReading", "condition",
                              "repairCost", "jobCardId", "notes", "version"},
                       err) ||
        !validUuidOpt(body, "vehicleId", err, action == "mount") ||
        !validDate(body, "eventDate", err, true) ||
        !validDec(body, "cumOdoReading", err, "0") ||
        !validEnum(body, "condition", {"NEW", "REBUILT", "USED", "REMOVED", "SCRAPPED"}, err, "USED") ||
        !validDec(body, "repairCost", err, "0") ||
        !validUuidOpt(body, "jobCardId", err) ||
        !validText(body, "notes", 500, err))
      co_return fail("validation_error", err);

    const auto cur = co_await db->execSqlCoro(
        "SELECT status, current_vehicle_id, mounted_cum_odo::text AS mounted_odo, "
        "accumulated_hours::text AS acc_hrs, cumulative_repair_cost::text AS rep_cost "
        "FROM fwm_major_components WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false FOR UPDATE",
        who.tenantId, id);
    if (cur.empty())
      co_return fail("not_found", "Major component not found.");
    const std::string curStatus = cur[0]["status"].as<std::string>();
    if (curStatus == "scrapped")
      co_return fail("conflict", "Scrapped components are terminal.");

    std::string nextStatus = curStatus;
    std::string nextVeh = optCol(cur[0], "current_vehicle_id");
    std::string eventType = action == "mount" ? "mounted" : action == "remove" ? "removed" : action == "repair" ? "repaired" : "scrapped";
    long long accHours = dec6(cur[0]["acc_hrs"].as<std::string>());
    long long repTotal = dec6(cur[0]["rep_cost"].as<std::string>()) + dec6(body["repairCost"].asString());

    if (action == "mount") {
      if (curStatus == "fitted")
        co_return fail("conflict", "Remove component from its current vehicle before mounting elsewhere.");
      nextStatus = "fitted";
      nextVeh = body["vehicleId"].asString();
      co_await db->execSqlCoro(
          "UPDATE fwm_major_components SET status='fitted',current_vehicle_id=$3::uuid,"
          "mounted_date=$4::date,mounted_cum_odo=($5::text)::numeric,condition=$6,"
          "last_modified_at=now(),last_modified_by_user_id=$7::uuid,version=version+1 "
          "WHERE tenant_id=$1 AND id=$2::uuid",
          who.tenantId, id, nextVeh, body["eventDate"].asString(), body["cumOdoReading"].asString(),
          body["condition"].asString(), who.userId);
    } else if (action == "remove") {
      if (curStatus != "fitted")
        co_return fail("conflict", "Component is not currently fitted.");
      const long long mountedOdo = dec6(cur[0]["mounted_odo"].as<std::string>());
      const long long removedOdo = dec6(body["cumOdoReading"].asString());
      if (removedOdo > mountedOdo)
        accHours += (removedOdo - mountedOdo);
      nextStatus = "unassigned";
      nextVeh = "";
      co_await db->execSqlCoro(
          "UPDATE fwm_major_components SET status='unassigned',current_vehicle_id=NULL,"
          "accumulated_hours=($3::text)::numeric,condition=$4,"
          "last_modified_at=now(),last_modified_by_user_id=$5::uuid,version=version+1 "
          "WHERE tenant_id=$1 AND id=$2::uuid",
          who.tenantId, id, dec6str(accHours), body["condition"].asString(), who.userId);
    } else if (action == "repair") {
      co_await db->execSqlCoro(
          "UPDATE fwm_major_components SET condition=$3,cumulative_repair_cost=($4::text)::numeric,"
          "status=CASE WHEN status='unassigned' THEN 'in_repair' ELSE status END,"
          "last_modified_at=now(),last_modified_by_user_id=$5::uuid,version=version+1 "
          "WHERE tenant_id=$1 AND id=$2::uuid",
          who.tenantId, id, body["condition"].asString(), dec6str(repTotal), who.userId);
    } else { // scrap
      if (curStatus == "fitted") {
        const long long mountedOdo = dec6(cur[0]["mounted_odo"].as<std::string>());
        const long long curOdo = dec6(body["cumOdoReading"].asString());
        if (curOdo > mountedOdo)
          accHours += (curOdo - mountedOdo);
      }
      co_await db->execSqlCoro(
          "UPDATE fwm_major_components SET status='scrapped',current_vehicle_id=NULL,"
          "condition='SCRAPPED',accumulated_hours=($3::text)::numeric,"
          "last_modified_at=now(),last_modified_by_user_id=$4::uuid,version=version+1 "
          "WHERE tenant_id=$1 AND id=$2::uuid",
          who.tenantId, id, dec6str(accHours), who.userId);
    }
    const std::string eventVeh = nextVeh.empty() ? optStr(body, "vehicleId") : nextVeh;
    const std::string eventCond = action == "scrap" ? std::string("SCRAPPED") : body["condition"].asString();
    const std::string eventJob = optStr(body, "jobCardId");
    co_await addComponentEvent(db, who, id, eventVeh, eventType, body["eventDate"].asString(),
                               body["cumOdoReading"].asString(), eventCond, action == "scrap",
                               body["repairCost"].asString(), eventJob, body["notes"].asString());
    co_return co_await fetchMajorComponent(db, who, canWrite, selectOne, id);
  }
  if (action != "create" && action != "update")
    co_return fail("validation_error", "Unsupported major-components action.");
  const bool isUpdate = action == "update";
  if (isUpdate && !uuid(id))
    co_return fail("validation_error", "Valid component UUID required.");
  std::string err;
  std::set<std::string> allowed{"componentCode", "serialNo", "componentType", "description",
                                "manufacturer", "condition", "estimatedLifeHours", "purchaseCost",
                                "invItemId", "invSerialId", "notes"};
  if (isUpdate)
    allowed.insert("version");
  if (!allowedFields(body, allowed, err))
    co_return fail("validation_error", err);
  if (isUpdate && (!body["version"].isInt() || body["version"].asInt() < 1))
    co_return fail("validation_error", "A valid version is required.");
  if (!validText(body, "componentCode", 40, err, true) ||
      !validText(body, "serialNo", 120, err) ||
      !validText(body, "componentType", 60, err, true) ||
      !validText(body, "description", 300, err) ||
      !validText(body, "manufacturer", 120, err) ||
      !validEnum(body, "condition", {"NEW", "REBUILT", "USED", "REMOVED", "SCRAPPED"}, err, "NEW") ||
      !validDec(body, "estimatedLifeHours", err, "0") ||
      !validDec(body, "purchaseCost", err, "0") ||
      !validUuidOpt(body, "invItemId", err) ||
      !validUuidOpt(body, "invSerialId", err) ||
      !validText(body, "notes", 500, err))
    co_return fail("validation_error", err);

  if (!isUpdate) {
    const auto saved = co_await db->execSqlCoro(
        "INSERT INTO fwm_major_components(tenant_id,component_code,serial_no,component_type,"
        "description,manufacturer,condition,estimated_life_hours,purchase_cost,inv_item_id,"
        "inv_serial_id,notes,created_by_user_id) "
        "VALUES($1::uuid,$2,$3,$4,$5,$6,$7,($8::text)::numeric,($9::text)::numeric,"
        "NULLIF($10,'')::uuid,NULLIF($11,'')::uuid,$12,$13::uuid) RETURNING id",
        who.tenantId, body["componentCode"].asString(), body["serialNo"].asString(),
        body["componentType"].asString(), body["description"].asString(),
        body["manufacturer"].asString(), body["condition"].asString(),
        body["estimatedLifeHours"].asString(), body["purchaseCost"].asString(),
        optStr(body, "invItemId"), optStr(body, "invSerialId"),
        body["notes"].asString(), who.userId);
    const std::string cid = saved[0]["id"].as<std::string>();
    co_await addComponentEvent(db, who, cid, "", "created", "2026-01-01", "0",
                               body["condition"].asString(), false, "0", "", body["notes"].asString());
    co_return co_await fetchMajorComponent(db, who, canWrite, selectOne, cid);
  }
  const auto updated = co_await db->execSqlCoro(
      "UPDATE fwm_major_components SET component_code=$3,serial_no=$4,component_type=$5,"
      "description=$6,manufacturer=$7,condition=$8,estimated_life_hours=($9::text)::numeric,"
      "purchase_cost=($10::text)::numeric,inv_item_id=NULLIF($11,'')::uuid,"
      "inv_serial_id=NULLIF($12,'')::uuid,notes=$13,"
      "last_modified_at=now(),last_modified_by_user_id=$14::uuid,version=version+1 "
      "WHERE tenant_id=$1 AND id=$2::uuid AND version=$15 AND is_deleted=false RETURNING id",
      who.tenantId, id, body["componentCode"].asString(), body["serialNo"].asString(),
      body["componentType"].asString(), body["description"].asString(),
      body["manufacturer"].asString(), body["condition"].asString(),
      body["estimatedLifeHours"].asString(), body["purchaseCost"].asString(),
      optStr(body, "invItemId"), optStr(body, "invSerialId"),
      body["notes"].asString(), who.userId, body["version"].asInt());
  if (updated.empty())
    co_return fail("conflict", "Major component not found or modified concurrently.");
  co_return co_await fetchMajorComponent(db, who, canWrite, selectOne, id);
}

drogon::Task<dto::BaseApiResponse>
fetchTyre(DbClientPtr db, const utils::AuditIdentity &who, bool canWrite, const char *selectOne,
          const std::string &tid) {
  const auto rows = co_await db->execSqlCoro(
      std::string(selectOne) + " WHERE t.tenant_id=$1 AND t.id=$2::uuid AND t.is_deleted=false",
      who.tenantId, tid);
  if (rows.empty())
    co_return fail("not_found", "Tyre record not found.");
  auto out = parse(rows[0]["record"].as<std::string>());
  const auto ev = co_await db->execSqlCoro(
      "SELECT jsonb_build_object('id',e.id,'vehicleId',e.vehicle_id,'eventType',e.event_type,"
      "'eventDate',e.event_date,'axlePosition',e.axle_position,'meterReading',e.meter_reading::text,"
      "'treadDepthMm',e.tread_depth_mm::text,'cost',e.cost::text,'locationNote',e.location_note,"
      "'jobCardId',e.job_card_id,'notes',e.notes,'version',e.version)::text AS record "
      "FROM fwm_tyre_events e WHERE e.tenant_id=$1 AND e.tyre_id=$2::uuid AND e.is_deleted=false ORDER BY e.version",
      who.tenantId, tid);
  out["history"] = Json::arrayValue;
  for (const auto &row : ev)
    out["history"].append(parse(row["record"].as<std::string>()));
  out["canWrite"] = canWrite;
  co_return okRecord(out);
}

drogon::Task<dto::BaseApiResponse>
tyres(DbClientPtr db, const std::string &action, const std::string &id, Json::Value body,
      int page, int size, const std::string &query, const utils::AuditIdentity &who,
      bool canWrite) {
  const char *selectOne = R"(
SELECT jsonb_build_object(
 'id', t.id, 'version', t.version, 'serialNo', t.serial_no, 'brand', t.brand,
 'sizeSpec', t.size_spec, 'pattern', t.pattern, 'invItemId', t.inv_item_id,
 'invSerialId', t.inv_serial_id, 'status', t.status, 'currentVehicleId', t.current_vehicle_id,
 'assetNo', COALESCE(v.asset_no,''), 'registrationNo', COALESCE(v.registration_no,''),
 'axlePosition', t.axle_position, 'fittedDate', t.fitted_date,
 'fittedMeterReading', t.fitted_meter_reading::text,
 'currentTreadDepthMm', t.current_tread_depth_mm::text,
 'purchaseCost', t.purchase_cost::text, 'accumulatedMeterUsage', t.accumulated_meter_usage::text,
 'supplierId', t.supplier_id, 'purchaseLocation', t.purchase_location, 'notes', t.notes
)::text AS record
FROM fwm_tyres t
LEFT JOIN fwm_vehicles v ON v.tenant_id=t.tenant_id AND v.id=t.current_vehicle_id AND v.is_deleted=false)";

  if (action == "list") {
    const std::string q = search(query);
    const std::string status = body.isObject() && body["status"].isString() ? trim(body["status"].asString()) : "";
    const auto cnt = co_await db->execSqlCoro(
        "SELECT count(*) AS total FROM fwm_tyres WHERE tenant_id=$1 AND is_deleted=false "
        "AND ($2='' OR status=$2) AND ($3='' OR strpos(lower(serial_no||' '||brand||' '||size_spec||' '||purchase_location),lower($3))>0)",
        who.tenantId, status, q);
    const auto rows = co_await db->execSqlCoro(
        std::string(selectOne) +
            " WHERE t.tenant_id=$1 AND t.is_deleted=false AND ($2='' OR t.status=$2) "
            "AND ($3='' OR strpos(lower(t.serial_no||' '||t.brand||' '||t.size_spec||' '||t.purchase_location),lower($3))>0) "
            "ORDER BY t.status, lower(t.serial_no) LIMIT $4 OFFSET $5",
        who.tenantId, status, q, size, static_cast<long long>(page - 1) * size);
    dto::BaseApiResponse r;
    r.result["data"] = Json::arrayValue;
    for (const auto &row : rows)
      r.result["data"].append(parse(row["record"].as<std::string>()));
    r.result["totalCount"] = Json::Int64(cnt[0]["total"].as<long long>());
    r.result["canWrite"] = canWrite;
    r.success = true;
    co_return r;
  }
  if (action == "get") {
    if (!uuid(id))
      co_return fail("validation_error", "Valid tyre UUID required.");
    co_return co_await fetchTyre(db, who, canWrite, selectOne, id);
  }
  if (action == "delete") {
    if (!uuid(id) || !body.isObject() || !body["version"].isInt() || body["version"].asInt() < 1)
      co_return fail("validation_error", "ID and version required.");
    const auto del = co_await db->execSqlCoro(
        "UPDATE fwm_tyres SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$3::uuid,"
        "version=version+1 WHERE tenant_id=$1 AND id=$2::uuid AND status='in_stock' AND version=$4 "
        "AND is_deleted=false RETURNING id",
        who.tenantId, id, who.userId, body["version"].asInt());
    if (del.empty())
      co_return fail("conflict", "Only in-stock tyres at current version can be deleted.");
    Json::Value res;
    res["id"] = id;
    res["isDeleted"] = true;
    co_return okRecord(res);
  }
  if (action == "fit" || action == "rotate" || action == "repair" || action == "remove" ||
      action == "retread" || action == "scrap") {
    if (!uuid(id))
      co_return fail("validation_error", "Valid tyre UUID required.");
    std::string err;
    if (!allowedFields(body, {"vehicleId", "eventDate", "axlePosition", "meterReading",
                              "treadDepthMm", "cost", "locationNote", "jobCardId", "notes", "version"},
                       err) ||
        !validUuidOpt(body, "vehicleId", err, action == "fit" || action == "rotate") ||
        !validDate(body, "eventDate", err, true) ||
        !validText(body, "axlePosition", 30, err, action == "fit" || action == "rotate") ||
        !validDec(body, "meterReading", err, "0") ||
        !validDec(body, "treadDepthMm", err, "0") ||
        !validDec(body, "cost", err, "0") ||
        !validText(body, "locationNote", 120, err) ||
        !validUuidOpt(body, "jobCardId", err) ||
        !validText(body, "notes", 500, err))
      co_return fail("validation_error", err);

    const auto cur = co_await db->execSqlCoro(
        "SELECT status, current_vehicle_id, fitted_meter_reading::text AS fit_m, "
        "accumulated_meter_usage::text AS acc_m FROM fwm_tyres "
        "WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false FOR UPDATE",
        who.tenantId, id);
    if (cur.empty())
      co_return fail("not_found", "Tyre not found.");
    const std::string curStatus = cur[0]["status"].as<std::string>();
    if (curStatus == "scrapped")
      co_return fail("conflict", "Scrapped tyres are terminal.");

    long long accUsage = dec6(cur[0]["acc_m"].as<std::string>());
    const long long curMeter = dec6(body["meterReading"].asString());
    const long long fitMeter = dec6(cur[0]["fit_m"].as<std::string>());
    std::string eventType;
    std::string vehOut = optCol(cur[0], "current_vehicle_id");

    if (action == "fit") {
      if (curStatus == "fitted")
        co_return fail("conflict", "Tyre is already fitted; remove or rotate it instead.");
      eventType = "fitted";
      vehOut = body["vehicleId"].asString();
      co_await db->execSqlCoro(
          "UPDATE fwm_tyres SET status='fitted',current_vehicle_id=$3::uuid,axle_position=$4,"
          "fitted_date=$5::date,fitted_meter_reading=($6::text)::numeric,"
          "current_tread_depth_mm=CASE WHEN ($7::text)::numeric>0 THEN ($7::text)::numeric ELSE current_tread_depth_mm END,"
          "last_modified_at=now(),last_modified_by_user_id=$8::uuid,version=version+1 "
          "WHERE tenant_id=$1 AND id=$2::uuid",
          who.tenantId, id, vehOut, body["axlePosition"].asString(), body["eventDate"].asString(),
          body["meterReading"].asString(), body["treadDepthMm"].asString(), who.userId);
    } else if (action == "rotate") {
      if (curStatus != "fitted")
        co_return fail("conflict", "Only fitted tyres can be rotated.");
      eventType = "rotated";
      vehOut = body["vehicleId"].asString();
      co_await db->execSqlCoro(
          "UPDATE fwm_tyres SET current_vehicle_id=$3::uuid,axle_position=$4,"
          "current_tread_depth_mm=CASE WHEN ($5::text)::numeric>0 THEN ($5::text)::numeric ELSE current_tread_depth_mm END,"
          "last_modified_at=now(),last_modified_by_user_id=$6::uuid,version=version+1 "
          "WHERE tenant_id=$1 AND id=$2::uuid",
          who.tenantId, id, vehOut, body["axlePosition"].asString(), body["treadDepthMm"].asString(),
          who.userId);
    } else if (action == "remove" || action == "retread" || action == "scrap") {
      if (curStatus == "fitted" && curMeter > fitMeter)
        accUsage += (curMeter - fitMeter);
      const std::string nextStatus = action == "remove" ? "in_stock" : action == "retread" ? "retread" : "scrapped";
      eventType = action == "remove" ? "removed" : action == "retread" ? "retreaded" : "scrapped";
      vehOut = "";
      co_await db->execSqlCoro(
          "UPDATE fwm_tyres SET status=$3,current_vehicle_id=NULL,axle_position='',"
          "accumulated_meter_usage=($4::text)::numeric,"
          "current_tread_depth_mm=CASE WHEN ($5::text)::numeric>0 THEN ($5::text)::numeric ELSE current_tread_depth_mm END,"
          "last_modified_at=now(),last_modified_by_user_id=$6::uuid,version=version+1 "
          "WHERE tenant_id=$1 AND id=$2::uuid",
          who.tenantId, id, nextStatus, dec6str(accUsage), body["treadDepthMm"].asString(), who.userId);
    } else { // repair
      eventType = "repaired";
      co_await db->execSqlCoro(
          "UPDATE fwm_tyres SET current_tread_depth_mm=CASE WHEN ($3::text)::numeric>0 THEN ($3::text)::numeric ELSE current_tread_depth_mm END,"
          "last_modified_at=now(),last_modified_by_user_id=$4::uuid,version=version+1 "
          "WHERE tenant_id=$1 AND id=$2::uuid",
          who.tenantId, id, body["treadDepthMm"].asString(), who.userId);
    }
    const std::string eventVeh = vehOut.empty() ? optStr(body, "vehicleId") : vehOut;
    const std::string eventJob = optStr(body, "jobCardId");
    co_await addTyreEvent(db, who, id, eventVeh, eventType, body["eventDate"].asString(),
                          body["axlePosition"].asString(), body["meterReading"].asString(),
                          body["treadDepthMm"].asString(), body["cost"].asString(),
                          body["locationNote"].asString(), eventJob, body["notes"].asString());
    co_return co_await fetchTyre(db, who, canWrite, selectOne, id);
  }
  if (action != "create" && action != "update")
    co_return fail("validation_error", "Unsupported tyres action.");
  const bool isUpdate = action == "update";
  if (isUpdate && !uuid(id))
    co_return fail("validation_error", "Valid tyre UUID required.");
  std::string err;
  std::set<std::string> allowed{"serialNo", "brand", "sizeSpec", "pattern", "invItemId",
                                "invSerialId", "currentTreadDepthMm", "purchaseCost",
                                "supplierId", "purchaseLocation", "notes"};
  if (isUpdate)
    allowed.insert("version");
  if (!allowedFields(body, allowed, err))
    co_return fail("validation_error", err);
  if (isUpdate && (!body["version"].isInt() || body["version"].asInt() < 1))
    co_return fail("validation_error", "A valid version is required.");
  if (!validText(body, "serialNo", 120, err, true) ||
      !validText(body, "brand", 80, err) ||
      !validText(body, "sizeSpec", 60, err) ||
      !validText(body, "pattern", 60, err) ||
      !validUuidOpt(body, "invItemId", err) ||
      !validUuidOpt(body, "invSerialId", err) ||
      !validDec(body, "currentTreadDepthMm", err, "0") ||
      !validDec(body, "purchaseCost", err, "0") ||
      !validUuidOpt(body, "supplierId", err) ||
      !validText(body, "purchaseLocation", 120, err) ||
      !validText(body, "notes", 500, err))
    co_return fail("validation_error", err);

  if (!isUpdate) {
    const auto saved = co_await db->execSqlCoro(
        "INSERT INTO fwm_tyres(tenant_id,serial_no,brand,size_spec,pattern,inv_item_id,inv_serial_id,"
        "current_tread_depth_mm,purchase_cost,supplier_id,purchase_location,notes,created_by_user_id) "
        "VALUES($1::uuid,$2,$3,$4,$5,NULLIF($6,'')::uuid,NULLIF($7,'')::uuid,($8::text)::numeric,"
        "($9::text)::numeric,NULLIF($10,'')::uuid,$11,$12,$13::uuid) RETURNING id",
        who.tenantId, body["serialNo"].asString(), body["brand"].asString(),
        body["sizeSpec"].asString(), body["pattern"].asString(),
        optStr(body, "invItemId"), optStr(body, "invSerialId"),
        body["currentTreadDepthMm"].asString(), body["purchaseCost"].asString(),
        optStr(body, "supplierId"),
        body["purchaseLocation"].asString(), body["notes"].asString(), who.userId);
    const std::string tid = saved[0]["id"].as<std::string>();
    co_await addTyreEvent(db, who, tid, "", "purchased", "2026-01-01", "", "0",
                          body["currentTreadDepthMm"].asString(), body["purchaseCost"].asString(),
                          body["purchaseLocation"].asString(), "", body["notes"].asString());
    co_return co_await fetchTyre(db, who, canWrite, selectOne, tid);
  }
  const auto updated = co_await db->execSqlCoro(
      "UPDATE fwm_tyres SET serial_no=$3,brand=$4,size_spec=$5,pattern=$6,"
      "inv_item_id=NULLIF($7,'')::uuid,inv_serial_id=NULLIF($8,'')::uuid,"
      "current_tread_depth_mm=($9::text)::numeric,purchase_cost=($10::text)::numeric,"
      "supplier_id=NULLIF($11,'')::uuid,purchase_location=$12,notes=$13,"
      "last_modified_at=now(),last_modified_by_user_id=$14::uuid,version=version+1 "
      "WHERE tenant_id=$1 AND id=$2::uuid AND version=$15 AND is_deleted=false RETURNING id",
      who.tenantId, id, body["serialNo"].asString(), body["brand"].asString(),
      body["sizeSpec"].asString(), body["pattern"].asString(),
      optStr(body, "invItemId"), optStr(body, "invSerialId"),
      body["currentTreadDepthMm"].asString(), body["purchaseCost"].asString(),
      optStr(body, "supplierId"),
      body["purchaseLocation"].asString(), body["notes"].asString(), who.userId,
      body["version"].asInt());
  if (updated.empty())
    co_return fail("conflict", "Tyre record not found or modified concurrently.");
  co_return co_await fetchTyre(db, who, canWrite, selectOne, id);
}

drogon::Task<dto::BaseApiResponse>
schedules(DbClientPtr db, const std::string &action, const std::string &id, Json::Value body,
          int page, int size, const std::string &query, const std::string &unitId,
          const utils::AuditIdentity &who, bool canWrite) {
  const std::string unit = lower(trim(unitId));
  const char *selectOne = R"(
SELECT jsonb_build_object(
 'id', s.id, 'version', s.version, 'accountingUnitId', s.accounting_unit_id,
 'scheduleNumber', s.schedule_number, 'vehicleId', s.vehicle_id,
 'assetNo', v.asset_no, 'registrationNo', v.registration_no, 'makeModel', v.make_model,
 'scheduleClass', s.schedule_class, 'workCategory', s.work_category,
 'serviceType', s.service_type, 'scheduleDate', s.schedule_date,
 'modifiedServiceDate', s.modified_service_date,
 'estimatedDowntimeHours', s.estimated_downtime_hours::text,
 'triggerReading', s.trigger_reading::text, 'projectedEngineRun', s.projected_engine_run::text,
 'specialConditions', s.special_conditions, 'procedureId', s.procedure_id,
 'procedureCode', COALESCE(p.pcode,''), 'startTime', s.start_time,
 'status', s.status, 'jobCardId', s.job_card_id, 'notes', s.notes
)::text AS record
FROM fwm_maintenance_schedules s
JOIN fwm_vehicles v ON v.tenant_id=s.tenant_id AND v.id=s.vehicle_id AND v.is_deleted=false
LEFT JOIN fwm_procedures p ON p.tenant_id=s.tenant_id AND p.id=s.procedure_id AND p.is_deleted=false)";

  if (action == "list") {
    const std::string q = search(query);
    const std::string cls = body.isObject() && body["scheduleClass"].isString() ? trim(body["scheduleClass"].asString()) : "";
    const std::string cat = body.isObject() && body["workCategory"].isString() ? trim(body["workCategory"].asString()) : "";
    const std::string unitScope = uuidOrEmpty(unit);
    const auto cnt = co_await db->execSqlCoro(
        "SELECT count(*) AS total FROM fwm_maintenance_schedules s "
        "JOIN fwm_vehicles v ON v.tenant_id=s.tenant_id AND v.id=s.vehicle_id AND v.is_deleted=false "
        "WHERE s.tenant_id=$1 AND s.is_deleted=false AND ($2='' OR s.accounting_unit_id=$2::uuid) "
        "AND ($3='' OR s.schedule_class=$3) AND ($4='' OR s.work_category=$4) "
        "AND ($5='' OR strpos(lower(s.schedule_number||' '||v.asset_no||' '||v.registration_no||' '||s.special_conditions),lower($5))>0)",
        who.tenantId, unitScope, cls, cat, q);
    const auto rows = co_await db->execSqlCoro(
        std::string(selectOne) +
            " WHERE s.tenant_id=$1 AND s.is_deleted=false AND ($2='' OR s.accounting_unit_id=$2::uuid) "
            "AND ($3='' OR s.schedule_class=$3) AND ($4='' OR s.work_category=$4) "
            "AND ($5='' OR strpos(lower(s.schedule_number||' '||v.asset_no||' '||v.registration_no||' '||s.special_conditions),lower($5))>0) "
            "ORDER BY COALESCE(s.modified_service_date,s.schedule_date), v.asset_no LIMIT $6 OFFSET $7",
        who.tenantId, unitScope, cls, cat, q, size,
        static_cast<long long>(page - 1) * size);
    dto::BaseApiResponse r;
    r.result["data"] = Json::arrayValue;
    for (const auto &row : rows)
      r.result["data"].append(parse(row["record"].as<std::string>()));
    r.result["totalCount"] = Json::Int64(cnt[0]["total"].as<long long>());
    r.result["canWrite"] = canWrite;
    r.success = true;
    co_return r;
  }
  if (action == "get") {
    if (!uuid(id))
      co_return fail("validation_error", "Valid schedule UUID required.");
    const auto rows = co_await db->execSqlCoro(
        std::string(selectOne) + " WHERE s.tenant_id=$1 AND s.id=$2::uuid AND s.is_deleted=false",
        who.tenantId, id);
    if (rows.empty())
      co_return fail("not_found", "Maintenance schedule not found.");
    auto out = parse(rows[0]["record"].as<std::string>());
    out["canWrite"] = canWrite;
    co_return okRecord(out);
  }
  if (action == "next-number") {
    if (!uuid(unit))
      co_return fail("validation_error", "accountingUnitId is required.");
    const auto row = co_await db->execSqlCoro(
        "SELECT COALESCE(prefix,'PM') AS prefix, COALESCE(padding,5) AS padding, COALESCE(next_number,1) AS next_number "
        "FROM fwm_document_sequences WHERE tenant_id=$1 AND accounting_unit_id=$2::uuid AND document_type='schedule'",
        who.tenantId, unit);
    std::string prefix = "PM";
    int pad = 5;
    long long num = 1;
    if (!row.empty()) {
      prefix = row[0]["prefix"].as<std::string>();
      pad = row[0]["padding"].as<int>();
      num = row[0]["next_number"].as<long long>();
    }
    std::string s = std::to_string(num);
    if (static_cast<int>(s.size()) < pad)
      s = std::string(static_cast<size_t>(pad - static_cast<int>(s.size())), '0') + s;
    Json::Value out;
    out["nextNumber"] = prefix + "-" + s;
    co_return okRecord(out);
  }
  if (action == "generate") {
    // Mcguan Generate Maintenance Schedules (Forecast Run for live vehicles).
    std::string err;
    if (!allowedFields(body, {"accountingUnitId", "horizonDays", "fromDate"}, err) ||
        !validUuidOpt(body, "accountingUnitId", err, false) ||
        !validDate(body, "fromDate", err, false))
      co_return fail("validation_error", err);
    int horizon = 30;
    if (!body["horizonDays"].isNull()) {
      if (!body["horizonDays"].isInt() || body["horizonDays"].asInt() < 1 ||
          body["horizonDays"].asInt() > 365)
        co_return fail("validation_error", "horizonDays must be between 1 and 365.");
      horizon = body["horizonDays"].asInt();
    }
    const std::string effUnit =
        body["accountingUnitId"].isNull() ? unit : body["accountingUnitId"].asString();
    if (!uuid(effUnit))
      co_return fail("validation_error", "accountingUnitId is required.");

    const auto triggers = co_await db->execSqlCoro(
        "SELECT v.id AS vehicle_id, v.asset_no, v.is_heavy_machinery, v.current_meter_reading::text AS cur, "
        "v.weekday_utilization::text AS wu, v.weekday_days, v.saturday_utilization::text AS su, "
        "v.sunday_utilization::text AS sunu, t.trigger_type, t.service_frequency::text AS freq, "
        "t.service_downtime_hours::text AS dt, t.major_service_frequency::text AS mfreq, "
        "t.major_service_downtime_hours::text AS mdt, t.last_service_reading::text AS lsr, "
        "t.last_major_service_reading::text AS lmsr "
        "FROM fwm_vehicles v "
        "JOIN fwm_pm_triggers t ON t.tenant_id=v.tenant_id AND t.vehicle_id=v.id AND t.is_deleted=false AND t.is_active=true "
        "WHERE v.tenant_id=$1 AND v.accounting_unit_id=$2::uuid AND v.is_deleted=false AND v.status IN('active','in_workshop') "
        "ORDER BY v.asset_no",
        who.tenantId, effUnit);

    Json::Value created(Json::arrayValue);
    for (const auto &tr : triggers) {
      const std::string vid = tr["vehicle_id"].as<std::string>();
      const long double cur = std::stold(tr["cur"].as<std::string>());
      const long double lsr = std::stold(tr["lsr"].as<std::string>());
      const long double freq = std::stold(tr["freq"].as<std::string>());
      const long double mfreq = std::stold(tr["mfreq"].as<std::string>());
      const long double lmsr = std::stold(tr["lmsr"].as<std::string>());
      const long double weeklyUsage =
          std::stold(tr["wu"].as<std::string>()) * tr["weekday_days"].as<int>() +
          std::stold(tr["su"].as<std::string>()) + std::stold(tr["sunu"].as<std::string>());
      const long double dailyAvg = weeklyUsage > 0 ? weeklyUsage / 7.0L : 8.0L;
      const long double nextMinorTarget = lsr + freq;
      const long double nextMajorTarget = mfreq > 0 ? (lmsr + mfreq) : 0;
      const bool isMajor = nextMajorTarget > 0 && nextMajorTarget <= nextMinorTarget;
      const long double target = isMajor ? nextMajorTarget : nextMinorTarget;
      const long double remaining = target > cur ? (target - cur) : 0;
      const int daysOut = static_cast<int>(std::ceil(remaining / dailyAvg));
      if (daysOut > horizon)
        continue;
      const auto dup = co_await db->execSqlCoro(
          "SELECT 1 FROM fwm_maintenance_schedules WHERE tenant_id=$1 AND vehicle_id=$2::uuid "
          "AND is_deleted=false AND status IN('forecasted','scheduled') AND abs(trigger_reading-($3::text)::numeric)<0.01 LIMIT 1",
          who.tenantId, vid, dec6str(static_cast<long long>(std::llround(target * SCALE))));
      if (!dup.empty())
        continue;
      const std::string schNum = co_await nextNumber(db, who, effUnit, "schedule", "PM");
      const std::string sClass = tr["is_heavy_machinery"].as<bool>() ? "heavy_machinery" : "light_vehicle";
      const std::string sType = isMajor ? "Major Service" : "Service";
      const std::string dt = isMajor ? tr["mdt"].as<std::string>() : tr["dt"].as<std::string>();
      const std::string cond = std::to_string(static_cast<long long>(std::llround(target))) + " " +
                               tr["trigger_type"].as<std::string>() + " " + sType;
      const auto ins = co_await db->execSqlCoro(
          "INSERT INTO fwm_maintenance_schedules(tenant_id,accounting_unit_id,schedule_number,vehicle_id,"
          "schedule_class,work_category,service_type,schedule_date,estimated_downtime_hours,"
          "trigger_reading,projected_engine_run,special_conditions,status,created_by_user_id) "
          "VALUES($1::uuid,$2::uuid,$3,$4::uuid,$5,'maintenance_schedule',$6,"
          "COALESCE(NULLIF($7,'')::date,CURRENT_DATE)+($8::int),($9::text)::numeric,"
          "($10::text)::numeric,($11::text)::numeric,$12,'forecasted',$13::uuid) RETURNING id",
          who.tenantId, effUnit, schNum, vid, sClass, sType,
          optStr(body, "fromDate"), daysOut, dt,
          dec6str(static_cast<long long>(std::llround(target * SCALE))),
          dec6str(static_cast<long long>(std::llround(remaining * SCALE))), cond, who.userId);
      Json::Value item;
      item["id"] = ins[0]["id"].as<std::string>();
      item["scheduleNumber"] = schNum;
      item["vehicleId"] = vid;
      item["assetNo"] = tr["asset_no"].as<std::string>();
      item["serviceType"] = sType;
      item["daysOut"] = daysOut;
      created.append(item);
    }
    Json::Value res;
    res["generatedCount"] = Json::UInt64(created.size());
    res["schedules"] = created;
    co_return okRecord(res);
  }
  if (action == "create-job-card") {
    if (!uuid(id))
      co_return fail("validation_error", "Valid schedule UUID required.");
    const auto sch = co_await db->execSqlCoro(
        "SELECT s.accounting_unit_id, s.vehicle_id, v.asset_group_id, v.cost_center_id, "
        "v.ownership_type, v.customer_id, v.coupled_trailer_id, v.current_meter_reading::text AS mr, "
        "s.service_type, s.work_category, s.procedure_id, s.estimated_downtime_hours::text AS dt, "
        "s.special_conditions, s.status, s.job_card_id "
        "FROM fwm_maintenance_schedules s JOIN fwm_vehicles v ON v.tenant_id=s.tenant_id AND v.id=s.vehicle_id "
        "WHERE s.tenant_id=$1 AND s.id=$2::uuid AND s.is_deleted=false FOR UPDATE OF s",
        who.tenantId, id);
    if (sch.empty())
      co_return fail("not_found", "Schedule not found.");
    if (!sch[0]["job_card_id"].isNull())
      co_return fail("conflict", "A Job Card is already linked to this schedule.");
    const std::string effUnit = sch[0]["accounting_unit_id"].as<std::string>();
    const std::string currId = co_await resolveUnitCurrency(db, who, effUnit);
    const std::string jobNum = co_await nextNumber(db, who, effUnit, "job_card", "JOB");
    const std::string svcType = sch[0]["service_type"].as<std::string>();
    const std::string jType = svcType == "Major Service" ? "major_service"
                              : svcType == "Breakdown"   ? "breakdown"
                              : svcType == "Planned Repair" ? "corrective_repair"
                                                         : "preventive_service";
    const std::string billing =
        sch[0]["ownership_type"].as<std::string>() == "customer_vehicle" &&
                !sch[0]["customer_id"].isNull()
            ? "customer_billable"
            : "internal_fleet";
    const auto job = co_await db->execSqlCoro(
        "INSERT INTO fwm_job_cards(tenant_id,accounting_unit_id,job_number,vehicle_id,"
        "coupled_trailer_id,job_type,billing_scope,customer_id,cost_center_id,schedule_id,"
        "procedure_id,currency_id,opened_date,meter_reading_in,downtime_hours,reported_fault,"
        "status,created_by_user_id) "
        "VALUES($1::uuid,$2::uuid,$3,$4::uuid,NULLIF($5,'')::uuid,$6,$7,NULLIF($8,'')::uuid,"
        "NULLIF($9,'')::uuid,$10::uuid,NULLIF($11,'')::uuid,$12::uuid,CURRENT_DATE,"
        "($13::text)::numeric,($14::text)::numeric,$15,'open',$16::uuid) RETURNING id",
        who.tenantId, effUnit, jobNum, sch[0]["vehicle_id"].as<std::string>(),
        optCol(sch[0], "coupled_trailer_id"),
        jType, billing, optCol(sch[0], "customer_id"),
        optCol(sch[0], "cost_center_id"), id,
        optCol(sch[0], "procedure_id"), currId,
        sch[0]["mr"].as<std::string>(), sch[0]["dt"].as<std::string>(),
        sch[0]["special_conditions"].as<std::string>(), who.userId);
    const std::string jobId = job[0]["id"].as<std::string>();
    // Populate service materials from asset group blueprint if present.
    if (!sch[0]["asset_group_id"].isNull()) {
      const std::string tier = svcType == "Major Service" ? "major_service" : "minor_service";
      co_await db->execSqlCoro(
          "INSERT INTO fwm_job_card_lines(tenant_id,job_card_id,line_number,line_type,source_type,"
          "description,inv_item_id,uom_id,quantity,unit_cost,line_cost,created_by_user_id) "
          "SELECT $1::uuid,$2::uuid,row_number() OVER (ORDER BY i.item_code),"
          "CASE WHEN m.is_lubricant THEN 'lubricant' ELSE 'spare_part' END,'inventory_issue',"
          "i.name,m.item_id,m.uom_id,m.quantity,i.average_unit_cost,"
          "round(m.quantity*i.average_unit_cost,6),$5::uuid "
          "FROM fwm_asset_group_materials m JOIN inv_items i ON i.tenant_id=m.tenant_id AND i.id=m.item_id "
          "WHERE m.tenant_id=$1 AND m.asset_group_id=$3::uuid AND m.service_tier=$4 AND m.is_deleted=false",
          who.tenantId, jobId, sch[0]["asset_group_id"].as<std::string>(), tier, who.userId);
    }
    co_await db->execSqlCoro(
        "UPDATE fwm_maintenance_schedules SET status='job_created',job_card_id=$3::uuid,"
        "last_modified_at=now(),last_modified_by_user_id=$4::uuid,version=version+1 "
        "WHERE tenant_id=$1 AND id=$2::uuid",
        who.tenantId, id, jobId, who.userId);
    Json::Value res;
    res["scheduleId"] = id;
    res["jobCardId"] = jobId;
    res["jobNumber"] = jobNum;
    co_return okRecord(res);
  }
  if (action == "requisitions") {
    if (!uuid(id))
      co_return fail("validation_error", "Valid schedule UUID required.");
    const auto sch = co_await db->execSqlCoro(
        "SELECT s.accounting_unit_id, s.schedule_number, s.schedule_date::text AS sdate, "
        "s.service_type, v.asset_no, v.asset_group_id, v.cost_center_id "
        "FROM fwm_maintenance_schedules s JOIN fwm_vehicles v ON v.tenant_id=s.tenant_id AND v.id=s.vehicle_id "
        "WHERE s.tenant_id=$1 AND s.id=$2::uuid AND s.is_deleted=false FOR SHARE of s",
        who.tenantId, id);
    if (sch.empty())
      co_return fail("not_found", "Schedule not found.");
    if (sch[0]["asset_group_id"].isNull())
      co_return fail("conflict", "Vehicle has no asset group service materials blueprint.");
    const std::string tier = sch[0]["service_type"].as<std::string>() == "Major Service"
                                 ? "major_service"
                                 : "minor_service";
    const auto mats = co_await db->execSqlCoro(
        "SELECT m.item_id, m.uom_id, m.quantity::text AS qty, i.name, i.last_unit_cost::text AS uc "
        "FROM fwm_asset_group_materials m JOIN inv_items i ON i.tenant_id=m.tenant_id AND i.id=m.item_id "
        "WHERE m.tenant_id=$1 AND m.asset_group_id=$2::uuid AND m.service_tier=$3 AND m.is_deleted=false",
        who.tenantId, sch[0]["asset_group_id"].as<std::string>(), tier);
    if (mats.empty())
      co_return fail("conflict", "No blueprint service materials configured for this tier.");
    Json::Value reqPayload;
    reqPayload["accountingUnitId"] = sch[0]["accounting_unit_id"].as<std::string>();
    reqPayload["requestDate"] = sch[0]["sdate"].as<std::string>();
    reqPayload["requiredByDate"] = sch[0]["sdate"].as<std::string>();
    reqPayload["priority"] = "normal";
    if (!sch[0]["cost_center_id"].isNull())
      reqPayload["costCenterId"] = sch[0]["cost_center_id"].as<std::string>();
    reqPayload["purpose"] = "PM Schedule " + sch[0]["schedule_number"].as<std::string>() +
                            " (" + sch[0]["asset_no"].as<std::string>() + ")";
    reqPayload["lines"] = Json::arrayValue;
    for (const auto &m : mats) {
      Json::Value l;
      l["itemId"] = m["item_id"].as<std::string>();
      l["uomId"] = m["uom_id"].as<std::string>();
      l["quantity"] = m["qty"].as<std::string>();
      l["estimatedUnitCost"] = m["uc"].as<std::string>();
      l["description"] = m["name"].as<std::string>();
      reqPayload["lines"].append(l);
    }
    const auto createdReq = co_await SupplyChainService::createRequisition(db, reqPayload, who);
    if (!createdReq.success)
      co_return createdReq;
    const std::string reqId = createdReq.result["id"].asString();
    const std::string reqNum = createdReq.result["requisitionNumber"].asString();
    co_await upsertCrossModuleLink(
        db, who, sch[0]["accounting_unit_id"].as<std::string>(), "schedule", id, "supply_chain",
        "pm_parts_requisition", reqId, reqNum, "posted",
        createdReq.result["estimatedTotal"].asString(), "", "", reqPayload, "scm_sch_" + id);
    Json::Value res;
    res["scheduleId"] = id;
    res["requisitionId"] = reqId;
    res["requisitionNumber"] = reqNum;
    co_return okRecord(res);
  }
  if (action == "delete") {
    if (!uuid(id) || !body.isObject() || !body["version"].isInt() || body["version"].asInt() < 1)
      co_return fail("validation_error", "ID and version required.");
    const auto del = co_await db->execSqlCoro(
        "UPDATE fwm_maintenance_schedules SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$3::uuid,"
        "version=version+1 WHERE tenant_id=$1 AND id=$2::uuid AND job_card_id IS NULL AND version=$4 "
        "AND is_deleted=false RETURNING id",
        who.tenantId, id, who.userId, body["version"].asInt());
    if (del.empty())
      co_return fail("conflict", "Schedule not found, already linked to a job card, or changed.");
    Json::Value res;
    res["id"] = id;
    res["isDeleted"] = true;
    co_return okRecord(res);
  }
  if (action != "create" && action != "update")
    co_return fail("validation_error", "Unsupported schedules action.");
  const bool isUpdate = action == "update";
  if (isUpdate && !uuid(id))
    co_return fail("validation_error", "Valid schedule UUID required.");
  std::string err;
  std::set<std::string> allowed{"accountingUnitId", "vehicleId", "scheduleClass", "workCategory",
                                "serviceType", "scheduleDate", "modifiedServiceDate",
                                "estimatedDowntimeHours", "triggerReading", "projectedEngineRun",
                                "specialConditions", "procedureId", "startTime", "status", "notes"};
  if (isUpdate)
    allowed.insert("version");
  if (!allowedFields(body, allowed, err))
    co_return fail("validation_error", err);
  if (isUpdate && (!body["version"].isInt() || body["version"].asInt() < 1))
    co_return fail("validation_error", "A valid version is required.");
  if (!validUuidOpt(body, "accountingUnitId", err, false) ||
      !validUuidOpt(body, "vehicleId", err, true) ||
      !validEnum(body, "scheduleClass", {"heavy_machinery", "light_vehicle"}, err, "heavy_machinery") ||
      !validEnum(body, "workCategory", {"maintenance_schedule", "planned_repair", "breakdown"},
                 err, "planned_repair") ||
      !validEnum(body, "serviceType", {"Service", "Major Service", "Planned Repair", "Breakdown"},
                 err, "Planned Repair") ||
      !validDate(body, "scheduleDate", err, true) ||
      !validDate(body, "modifiedServiceDate", err, false) ||
      !validDec(body, "estimatedDowntimeHours", err, "0") ||
      !validDec(body, "triggerReading", err, "0") ||
      !validDec(body, "projectedEngineRun", err, "0") ||
      !validText(body, "specialConditions", 200, err) ||
      !validUuidOpt(body, "procedureId", err) ||
      !validText(body, "startTime", 20, err) ||
      !validEnum(body, "status", {"forecasted", "scheduled", "deferred", "cancelled"}, err, "scheduled") ||
      !validText(body, "notes", 500, err))
    co_return fail("validation_error", err);

  const auto veh = co_await db->execSqlCoro(
      "SELECT accounting_unit_id FROM fwm_vehicles WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false FOR SHARE",
      who.tenantId, body["vehicleId"].asString());
  if (veh.empty())
    co_return fail("not_found", "Vehicle not found.");
  const std::string effUnit = body["accountingUnitId"].isNull()
                                  ? veh[0]["accounting_unit_id"].as<std::string>()
                                  : body["accountingUnitId"].asString();

  if (!isUpdate) {
    const std::string num = co_await nextNumber(db, who, effUnit, "schedule", "PM");
    const auto saved = co_await db->execSqlCoro(
        "INSERT INTO fwm_maintenance_schedules(tenant_id,accounting_unit_id,schedule_number,"
        "vehicle_id,schedule_class,work_category,service_type,schedule_date,modified_service_date,"
        "estimated_downtime_hours,trigger_reading,projected_engine_run,special_conditions,"
        "procedure_id,start_time,status,notes,created_by_user_id) "
        "VALUES($1::uuid,$2::uuid,$3,$4::uuid,$5,$6,$7,$8::date,NULLIF($9,'')::date,"
        "($10::text)::numeric,($11::text)::numeric,($12::text)::numeric,$13,NULLIF($14,'')::uuid,"
        "$15,$16,$17,$18::uuid) RETURNING id",
        who.tenantId, effUnit, num, body["vehicleId"].asString(),
        body["scheduleClass"].asString(), body["workCategory"].asString(),
        body["serviceType"].asString(), body["scheduleDate"].asString(),
        optStr(body, "modifiedServiceDate"),
        body["estimatedDowntimeHours"].asString(), body["triggerReading"].asString(),
        body["projectedEngineRun"].asString(), body["specialConditions"].asString(),
        optStr(body, "procedureId"),
        body["startTime"].asString(), body["status"].asString(), body["notes"].asString(),
        who.userId);
    const auto rows = co_await db->execSqlCoro(
        std::string(selectOne) + " WHERE s.tenant_id=$1 AND s.id=$2::uuid AND s.is_deleted=false",
        who.tenantId, saved[0]["id"].as<std::string>());
    co_return okRecord(parse(rows[0]["record"].as<std::string>()));
  }
  const auto updated = co_await db->execSqlCoro(
      "UPDATE fwm_maintenance_schedules SET schedule_class=$3,work_category=$4,service_type=$5,"
      "schedule_date=$6::date,modified_service_date=NULLIF($7,'')::date,"
      "estimated_downtime_hours=($8::text)::numeric,trigger_reading=($9::text)::numeric,"
      "projected_engine_run=($10::text)::numeric,special_conditions=$11,"
      "procedure_id=NULLIF($12,'')::uuid,start_time=$13,status=$14,notes=$15,"
      "last_modified_at=now(),last_modified_by_user_id=$16::uuid,version=version+1 "
      "WHERE tenant_id=$1 AND id=$2::uuid AND version=$17 AND is_deleted=false RETURNING id",
      who.tenantId, id, body["scheduleClass"].asString(), body["workCategory"].asString(),
      body["serviceType"].asString(), body["scheduleDate"].asString(),
      optStr(body, "modifiedServiceDate"),
      body["estimatedDowntimeHours"].asString(), body["triggerReading"].asString(),
      body["projectedEngineRun"].asString(), body["specialConditions"].asString(),
      optStr(body, "procedureId"),
      body["startTime"].asString(), body["status"].asString(), body["notes"].asString(),
      who.userId, body["version"].asInt());
  if (updated.empty())
    co_return fail("conflict", "Schedule not found or modified concurrently.");
  const auto rows = co_await db->execSqlCoro(
      std::string(selectOne) + " WHERE s.tenant_id=$1 AND s.id=$2::uuid AND s.is_deleted=false",
      who.tenantId, id);
  co_return okRecord(parse(rows[0]["record"].as<std::string>()));
}

} // namespace

drogon::Task<dto::BaseApiResponse>
handleOperationsOps(DbClientPtr db, const std::string &resource, const std::string &action,
                    const std::string &id, Json::Value body, int page, int size,
                    const std::string &query, const std::string &unitId,
                    const utils::AuditIdentity &who, bool, bool canWrite) {
  if (resource == "meter-changes")
    co_return co_await meterChanges(db, action, std::move(body), page, size, query, who, canWrite);
  if (resource == "stalled-meters" ||
      (resource == "vehicles" && action == "resolve-stalled-meter"))
    co_return co_await stalledMeters(db, action, id, std::move(body), who, canWrite);
  if (resource == "meter-readings")
    co_return co_await meterReadings(db, action, std::move(body), page, size, who, canWrite);
  if (resource == "fuel-logs")
    co_return co_await fuelLogs(db, action, id, std::move(body), page, size, query, unitId, who, canWrite);
  if (resource == "fuel-tolerances" && action == "list")
    co_return co_await fuelTolerances(db, who, page, size, canWrite);
  if (resource == "lubricant-logs")
    co_return co_await lubricantLogs(db, action, id, std::move(body), page, size, query, unitId, who, canWrite);
  if (resource == "major-components")
    co_return co_await majorComponents(db, action, id, std::move(body), page, size, query, who, canWrite);
  if (resource == "tyres")
    co_return co_await tyres(db, action, id, std::move(body), page, size, query, who, canWrite);
  if (resource == "schedules")
    co_return co_await schedules(db, action, id, std::move(body), page, size, query, unitId, who, canWrite);
  co_return fail("validation_error", "Unknown Fleet & Workshop operation.");
}

} // namespace business_desk::domain_services::fwm_internal
