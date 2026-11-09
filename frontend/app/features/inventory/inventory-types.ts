// Types for the Inventory workspace. Field names mirror the API projections
// emitted by domain_services/inventory (camelCase jsonb records).
export interface ItemRecord {
  id: string
  version?: number
  status?: string
  itemCode: string
  name: string
  itemType?: string
  categoryName?: string
  baseUomId?: string
  baseUom?: string
  baseUomCode?: string
  trackingMethod?: string
  valuationMethod?: string
  standardCost?: string
  averageUnitCost?: string
  purchaseUnitCost?: string
  isActive?: boolean
  isPurchasable?: boolean
  currencyCode?: string
  currencyId?: string
  onHand?: string
  barcode?: string
}
export interface WarehouseRecord {
  id: string
  version?: number
  code: string
  name: string
  warehouseType?: string
  address?: string
  isActive?: boolean
  allowNegativeStock?: boolean
}
export interface CategoryRecord { id: string; version?: number; code: string; name: string; isActive?: boolean }
export interface UomRecord { id: string; version?: number; code: string; name: string; uomType?: string; isBase?: boolean; isActive?: boolean }
export interface BalanceRecord {
  id: string
  itemId: string
  itemCode: string
  itemName: string
  warehouseId: string
  warehouseName: string
  warehouseType?: string
  batchId?: string | null
  batchNumber?: string | null
  quantityOnHand: string
  quantityReserved: string
  available: string
  averageUnitCost: string
  stockValue: string
  lastMovementAt?: string
}
export interface TransactionRecord {
  id: string
  documentId: string
  documentNumber: string
  documentType: string
  movementReason: string
  transactionDate: string
  itemId: string
  itemCode: string
  itemName: string
  warehouseId: string
  warehouseName: string
  batchNumber?: string | null
  quantity: string
  unitCost: string
  stockValue: string
  balanceQuantity: string
  balanceValue: string
  costingMethod: string
  referenceNumber?: string
  createdAt?: string
}
export interface DocumentLine {
  id?: string
  lineNumber: number
  itemId: string
  itemCode?: string
  itemName?: string
  uomId: string
  uomCode?: string
  conversionFactor?: string
  quantity: string
  quantityBase: string
  unitCost?: string | null
  lineValue?: string | null
  batchId?: string | null
  sourceBinId?: string | null
  destinationBinId?: string | null
  serialNumbers?: string[]
  description?: string
}
export interface DocumentEvent {
  action: string
  previousStatus?: string | null
  newStatus: string
  reason?: string
  version: number
  createdAt: string
  actor?: string | null
}
export interface StockDocument {
  id: string
  version?: number
  accountingUnitId?: string
  documentNumber: string
  documentType: string
  movementReason: string
  documentDate: string
  status: string
  sourceWarehouseId: string
  sourceWarehouse?: string
  destinationWarehouseId?: string | null
  destinationWarehouse?: string | null
  supplierId?: string | null
  supplierName?: string | null
  customerId?: string | null
  customerName?: string | null
  costCenterId?: string | null
  currencyCode?: string
  referenceNumber?: string
  notes?: string
  totalQuantity?: string
  totalValue?: string
  periodId?: string | null
  journalBatchId?: string | null
  createdAt?: string
  lastModifiedAt?: string
  lines?: DocumentLine[]
  events?: DocumentEvent[]
}
export interface InventoryDashboard {
  items?: { active?: number; total?: number }
  warehouses?: { active?: number; total?: number }
  stockValue?: { totalValue?: string; stockOnHand?: string }
  documents?: Record<string, number>
  lowStock?: { count?: number }
  openDocuments?: { count?: number }
}
export function emptyDashboard(): InventoryDashboard {
  return { items: {}, warehouses: {}, stockValue: {}, documents: {}, lowStock: {}, openDocuments: {} }
}
