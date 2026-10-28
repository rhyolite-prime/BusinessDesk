import { createError, getQuery, readBody, setHeader, type H3Event } from 'h3'
import { requireBusinessDeskSession } from './auth'
import { checkAuthOrigin } from '../../layers/shared/server/utils/tenant-auth'
import { headUuid } from './account-head-api'
export async function financialReportRequest(event:H3Event,write=false) {
 setHeader(event,'Cache-Control','no-store')
 if(write)checkAuthOrigin(event)
 const {accessToken}=await requireBusinessDeskSession(event), query=getQuery(event)
 if(!headUuid(query.accountingUnitId)||typeof query.through!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(query.through))throw createError({statusCode:400,statusMessage:'Valid accounting unit and through date required.'})
 const config=useRuntimeConfig(event),base=String(config.ledgerApiBaseUrl||config.authApiBaseUrl||'').replace(/\/$/,'')
 if(!base)throw createError({statusCode:503,statusMessage:'Financial reporting API is not configured.'})
 try {
  const result=await $fetch<{success:boolean;result:any;error?:{code:string;message:string}}>(`${base}/api/v1/ledger/financial-reports${write?'/mappings':''}`,{method:write?'PUT':'GET',query:{accountingUnitId:query.accountingUnitId,through:query.through},body:write?await readBody(event):undefined,headers:{authorization:`Bearer ${accessToken}`},retry:0,timeout:60000})
  if(!result.success)throw createError({statusCode:result.error?.code==='validation_error'?400:result.error?.code==='forbidden'?403:503})
  return result.result
 }catch(e:any){
  const status=e?.response?.status||e?.statusCode,detail=e?.response?._data?.error?.message
  const safe=typeof detail==='string'&&['Report exceeds 50,000 posted lines','Mapping must match','Supply 1–500','Invalid, duplicate'].some(prefix=>detail.startsWith(prefix))?detail:undefined
  const messages:Record<number,string>={400:'Check the dates, account classifications and report size limit.',401:'Sign in again.',403:'Tenant access required. Only tenant administrators can change report mappings.',404:'Active unit or base currency not found.'}
  throw createError({statusCode:messages[status]?status:503,statusMessage:safe||messages[status]||'Financial report service unavailable. Verify migration 027 and ledger prerequisites.'})
 }
}
