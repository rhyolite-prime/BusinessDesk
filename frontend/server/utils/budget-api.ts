import {
  createError,
  getQuery,
  getRouterParam,
  readBody,
  setHeader,
  type H3Event,
} from "h3";
import { requireBusinessDeskSession } from "./auth";
import { checkAuthOrigin } from "../../layers/shared/server/utils/tenant-auth";
import { headUuid } from "./account-head-api";
export async function budgetRequest(
  event: H3Event,
  method: "GET" | "POST" | "PUT" | "DELETE",
  mode: "list" | "detail" | "options" = "list",
) {
  setHeader(event, "Cache-Control", "no-store");
  if (method !== "GET") checkAuthOrigin(event);
  const { accessToken } = await requireBusinessDeskSession(event);
  const id = getRouterParam(event, "id"),
    query = getQuery(event);
  const body =
    method === "POST" || method === "PUT" ? await readBody(event) : undefined;
  const unit = body?.accountingUnitId ?? query.accountingUnitId;
  if (
    !headUuid(unit) ||
    (mode === "detail" && !headUuid(id)) ||
    (query.accountingUnitId !== undefined && query.accountingUnitId !== unit)
  )
    throw createError({
      statusCode: 400,
      statusMessage: "Valid accounting unit and record IDs are required.",
    });
  const config = useRuntimeConfig(event),
    base = String(
      config.ledgerApiBaseUrl || config.authApiBaseUrl || "",
    ).replace(/\/$/, "");
  if (!base)
    throw createError({
      statusCode: 503,
      statusMessage: "Budget API is not configured.",
    });
  try {
    const r = await $fetch<{
      success: boolean;
      result: any;
      error?: { code: string };
    }>(
      `${base}/api/v1/ledger/budgets${mode === "options" ? "/options" : mode === "detail" ? `/${id}` : ""}`,
      {
        method,
        body,
        query: { accountingUnitId: unit },
        retry: 0,
        timeout: 15000,
        headers: { authorization: `Bearer ${accessToken}` },
      },
    );
    if (!r.success) {
      const codes: Record<string, number> = {
        validation_error: 400,
        unauthorized: 401,
        forbidden: 403,
        not_found: 404,
        conflict: 409,
      };
      throw createError({ statusCode: codes[r.error?.code || ""] || 503, data: { code: r.error?.code } });
    }
    return r.result;
  } catch (e: any) {
    const status = e?.response?.status || e?.statusCode;
    const code = e?.data?.error?.code || e?.response?._data?.error?.code || e?.data?.code;
    if (code === "schema_not_ready") throw createError({
      statusCode: 503,
      statusMessage: "Budget database upgrade required. Apply migration 011_budgets.sql to the backend database.",
    });
    const messages: Record<number, string> = {
      400: "Select a live GL/cost center, valid month range (up to 60), and complete monthly amounts (up to 6 decimals).",
      401: "Sign in again to continue.",
      403: "Tenant access required.",
      404: "The budget or active accounting unit is no longer available.",
      409: "Duplicate schedule, non-draft budget or live composite reference prevents this change.",
    };
    throw createError({
      statusCode: messages[status] ? status : 503,
      statusMessage:
        messages[status] || "Budget service unavailable. Please retry.",
    });
  }
}
