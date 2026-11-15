# Fleet & Workshop Management implementation plan & architecture

- **Status:** database schema (`041`), backend C++ domain services & Drogon HTTP API implemented and verified with offline service/controller/ASan seam tests; frontend UI workspace (`/modules/fleet-workshop-management`) and Nuxt BFF routes (`/api/fleet-workshop/**`) remain staged behind the existing tenant catalog/subscription/nav wiring.
- **Baseline:** repository migrations `001`–`041`, `FleetWorkshopController` (`/api/v1/fleet-workshop-management/**`), `FleetWorkshopService`, and transactional `SupplyChainService::createRequisition`.

## 1. Deploy the database upgrade first

Apply **migration 041** (not `.down.sql`) after `001`–`040`:

```sh
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f database/migrations/041_fleet_workshop_management.sql
```

- Missing `fwm_*` tables return `schema_not_ready` / `503` via `probeSchema` without caching failures; applying `041` repairs subsequent requests without restarts.
- `database/migrations/041_fleet_workshop_management.down.sql` drops both `check_fwm_gl_settings_scope` and `update_fwm_updated_at` trigger functions, removes all 26 entries from `core_tenant_reset_registry`, and drops all 26 `fwm_*` tables in dependency order.

## 2. Schema summary (`26` `fwm_*` tables)

| Domain | Tables | Key invariants & cross-module FKs |
| --- | --- | --- |
| Foundation & GL | `fwm_document_sequences`, `fwm_gl_settings` | Per-unit numbering (`FUEL`, `LUB`, `PM`, `JOB`, `DIARY`, `VEH`) without mutating `Modules` (`1..16`); unit-scoped GL overrides validated by `check_fwm_gl_settings_scope` trigger; FKs to `gl_accounts`, `inv_warehouses`. |
| Fleet & BOM catalog | `fwm_asset_groups`, `fwm_asset_group_materials`, `fwm_asset_group_components`, `fwm_procedures`, `fwm_vehicles`, `fwm_pm_triggers`, `fwm_workshop_employees` | Asset groups store depreciation defaults, fuel tolerances, minor/major BOMs (`inv_items`, `inv_uoms`), and standard `PCode` checklists; vehicles link `fixed_asset_id`, `customer_id`, `supplier_id`, `cost_center_id`, trailers, and per-asset `pm_triggers`; workshop employees link `hr_employee_biodata`. |
| Telemetry, fuel & components | `fwm_meter_changes`, `fwm_meter_readings`, `fwm_fuel_logs`, `fwm_lubricant_logs`, `fwm_major_components`, `fwm_component_events`, `fwm_tyres`, `fwm_tyre_events` | Engine-run delta calculation, stalled-meter resolution, fuel tolerance calculation & alert feed, transactional `inv_stock_documents` + `gl_journal_batches` links on post/reverse, serialized component & tyre lifecycles with append-only event history. |
| Scheduling, jobs, diary & handoffs | `fwm_maintenance_schedules`, `fwm_job_cards`, `fwm_job_card_lines`, `fwm_job_card_assignments`, `fwm_job_milestones`, `fwm_job_card_events`, `fwm_diary_entries`, `fwm_diary_entry_allocations`, `fwm_cross_module_links` | PM generator (`hours_per_day`, weekday rules, `major_service` / `minor_service` BOM autofill), job card cost/billing rollups (`billGrand = billParts + billLabour + billOther + billTax`), field diary entries with multi-vehicle split & job promotion, and idempotent cross-module handoff tracking. |

All 26 tables carry `tenant_id`, optimistic `version`, `is_deleted`, audit timestamps/users, `(tenant_id, id)` uniqueness, and `core_tenant_reset_registry` registration under `'Fleet & Workshop Management'`.

## 3. Routes and authorization

All endpoints live under `/api/v1/fleet-workshop-management/**` in `controllers/FleetWorkshopController.{h,cc}` behind `TenantJwtAuthFilter` and `inventory_internal::authorize(..., "fleet_workshop", ...)` (supporting tenant-admin bypass plus granular `.read` / `.write` / `.manage` permissions). Read operations return `200`, creation/sub-line/schedule-job endpoints return `201`, and responses include `Cache-Control: no-store`.

| Resource | Endpoints & actions |
| --- | --- |
| `dashboard`, `gl-settings` | `GET /dashboard/summary`; `GET/PUT /gl-settings`, `GET /gl-settings/options` |
| `asset-groups` | CRUD + `/options`, `/{id}/materials` (`GET`/`PUT`), `/{id}/components` (`GET`/`PUT`) |
| `procedures`, `employees` | CRUD (`employees` includes `GET /employees/options`) |
| `vehicles` | CRUD + `/options`, `/next-number`, `/{id}/pm-triggers` (`GET`/`PUT`), `/{id}/resolve-stalled-meter`, `/{id}/handoff-fa` (`fa-handoff`) |
| `meter-changes`, `stalled-meters`, `meter-readings` | List/create meter changes & readings; list & resolve stalled meters |
| `fuel-logs`, `fuel-tolerances`, `lubricant-logs` | CRUD + `/next-number`, `/{id}/post`, `/{id}/reverse`; fuel-tolerance alert feed |
| `major-components`, `tyres` | CRUD + lifecycle actions (`mount`/`remove`/`repair`/`scrap`; `fit`/`rotate`/`repair`/`remove`/`retread`/`scrap`) |
| `schedules` | CRUD + `/next-number`, `POST /schedules/generate`, `POST /schedules/{id}/create-job-card`, `POST /schedules/{id}/requisitions` |
| `job-cards` | CRUD + `/next-number`, `/lines` (`GET`/`POST`/`PUT/{subId}`/`DELETE/{subId}`), `/assignments` (`GET`/`PUT`), `/milestones` (`GET`/`POST`/`PUT/{subId}`/`DELETE/{subId}`), `/issue-parts`, `/requisitions`, `/post-gl`, `/handoff`, `/transition` (`open`, `start`, `await_parts`, `resume`, `complete`, `close`, `cancel`) |
| `diary-entries` | CRUD + `/next-number`, `/{id}/allocate`, `/{id}/mark-paid`, `/{id}/promote` |
| `module-links`, `reports` | `GET /module-links`; `GET /reports?tab={forecast\|fuel_lubs\|jobs\|tyres\|major_components\|others}` with multi-currency conversion (`exchangeRate`) |

## 4. Cross-module integrations

- **Inventory (`InventoryService`):** posting fuel/lubricant logs or job-card spare parts creates and posts an `issue` stock document inside the caller's transaction; reversing fuel/lubricant logs calls `InventoryService::reverseStockDocument` inside the same transaction.
- **Supply Chain (`SupplyChainService::createRequisition`):** PM schedules and job cards raise purchase requisitions inside the active transaction via the extracted `createRequisition(transaction, payload, who)` overload.
- **General Ledger (`JournalService::createAndPost`):** fuel expense journals, internal job cost recoveries, and customer-billable workshop AR/revenue/VAT entries post balanced batches inside the transaction using `fwm_gl_settings` with `gl_default_accounts` fallback.
- **Staged financial/operational handoffs (`fwm_cross_module_links`):** Fixed Assets (`vehicle_asset_sync`), AP (`supplier_expense`), AR (`customer_invoice`), Point of Sale (`pos_charge`), and Project Management (`project_milestone`) persist idempotent staged records with `idempotency_key` until target posting engines are connected.

## 5. Verification & frontend status

- **Backend seam & controller suite (`test/fleet_workshop/run.sh`):** exercises master catalogs, telemetry, fuel/lubricant Inventory + GL post & reverse, component/tyre lifecycles, PM generation, job card costing + SCM requisitions + GL/AR/POS/PM handoffs, diary ledger allocation/payment/promotion, all 6 report tabs, `FleetWorkshopController` HTTP statuses (`200`, `201`, `400`, `401`, `403`, `409`, `503`), and migration/CMake/catalog parity (`sql_check.mjs`).
- **Frontend UI & deployment follow-up:** `frontend/app/features/modules/catalog.ts`, `frontend/app/features/tenant-account.ts`, `frontend/layers/shared/app/plugins/nav.registry.ts`, and `domain_services/tenants/TenantAccountService.cc` already wire `/modules/fleet-workshop-management` and `fleet_workshop_management` subscriptions. Dedicated Nuxt `/api/fleet-workshop/**` BFF proxies, operational workspace pages, and live PostgreSQL integration tests remain the next UI/QA milestone.
