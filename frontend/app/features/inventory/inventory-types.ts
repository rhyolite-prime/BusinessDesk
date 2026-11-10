// Types for the Inventory workspace. Field names mirror the camelCase jsonb
// projections emitted by domain_services/inventory (see docs/inventory.md).

export interface ItemRecord {
  id: string
  version?: number
  itemCode: string
  name: string
  description?: string
  itemCategoryId?: string | null
  categoryName?: string | null
  itemType?: string
  status?: string
  baseUomId?: string
  baseUom?: string
  baseUomName?: string
  purchaseUomId?: string | null
  salesUomId?: string | null
  trackingMethod?: string
  valuationMethod?: string
  currencyId?: string
  currencyCode?: string
  standardCost?: string
  purchaseUnitCost?: string
  saleUnitPrice?: string
  averageUnitCost?: string
  lastUnitCost?: string
  isPurchasable?: boolean
  isSellable?: boolean
  isTaxable?: boolean
  barcode?: string | null
  reorderPoint?: string
  minStockLevel?: string
  maxStockLevel?: string
  reorderQuantity?: string
  safetyStock?: string
  leadTimeDays?: number
  shelfLifeDays?: number
  grossWeight?: string
  netWeight?: string
  volume?: string
  inventoryAccountId?: string | null
  cogsAccountId?: string | null
  revenueAccountId?: string | null
  purchaseAccountId?: string | null
  varianceAccountId?: string | null
  defaultWarehouseId?: string | null
  onHand?: string
  stockValue?: string
}

export interface WarehouseRecord {
  id: string
  version?: number
  code: string
  name: string
  warehouseType?: string
  accountingUnitId?: string
  accountingUnitCode?: string
  address?: string
  contactPerson?: string
  phoneNo?: string
  email?: string
  isActive?: boolean
  allowsNegativeStock?: boolean
}

export interface CategoryRecord {
  id: string
  version?: number
  code: string
  name: string
  parentId?: string | null
  parentName?: string | null
  itemCount?: number
  isActive?: boolean
}

export interface UomRecord {
  id: string
  version?: number
  code: string
  name: string
  uomType?: string
  decimalPlaces?: number
  isActive?: boolean
}

export interface BinLocationRecord {
  id: string
  version?: number
  warehouseId: string
  warehouseName?: string
  code: string
  zone?: string | null
  description?: string
  capacity?: string
  isActive?: boolean
}

export interface ItemWarehouseRecord {
  id: string
  version?: number
  itemId: string
  itemCode?: string
  itemName?: string
  warehouseId: string
  warehouseName?: string
  defaultBinId?: string | null
  defaultBinCode?: string | null
  reorderPoint?: string
  minStockLevel?: string
  maxStockLevel?: string
  reorderQuantity?: string
  safetyStock?: string
  leadTimeDays?: number
  isActive?: boolean
}

export interface ItemSupplierRecord {
  id: string
  version?: number
  itemId: string
  itemCode?: string
  itemName?: string
  supplierId: string
  supplierName?: string
  supplierItemCode?: string | null
  supplierItemName?: string | null
  purchaseUomId?: string | null
  unitPrice?: string
  currencyId?: string
  leadTimeDays?: number
  minOrderQuantity?: string
  orderMultiple?: string
  isPreferred?: boolean
  isActive?: boolean
}

export interface UomConversionRecord {
  id: string
  version?: number
  itemId: string
  itemCode?: string
  fromUomId: string
  fromUom?: string
  toUomId: string
  toUom?: string
  factor: string
  isActive?: boolean
}

export interface BatchRecord {
  id: string
  version?: number
  itemId: string
  itemCode?: string
  itemName?: string
  batchNumber: string
  supplierBatchNumber?: string | null
  productionDate?: string | null
  expiryDate?: string | null
  qualityStatus: string
  isActive?: boolean
}

export interface SerialRecord {
  id: string
  version?: number
  itemId: string
  itemCode?: string
  itemName?: string
  serialNumber: string
  batchId?: string | null
  warehouseId?: string | null
  warehouseName?: string | null
  status?: string
  warrantyExpiryDate?: string | null
}

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
  costingMethod?: string
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
  quantityBase?: string
  countedQuantity?: string | null
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
  referenceNumber?: string
  notes?: string
  totalQuantity?: string
  totalValue?: string
  isPosted?: boolean
  periodId?: string | null
  journalBatchId?: string | null
  lines?: DocumentLine[]
  events?: DocumentEvent[]
}

export interface SnapshotRecord {
  id: string
  version?: number
  accountingUnitId: string
  accountingUnitCode?: string
  asOfDate: string
  status?: string
  itemCount: number
  totalQuantity: string
  totalValue: string
  notes?: string
  journalBatchId?: string | null
  postedAt?: string | null
  createdAt?: string
  lines?: {
    itemCode: string
    itemName: string
    warehouseName: string
    batchNumber?: string | null
    quantityOnHand: string
    unitCost: string
    stockValue: string
    costingMethod: string
  }[]
}

export interface PeriodCloseRecord {
  id: string
  version?: number
  accountingUnitId: string
  accountingUnitCode?: string
  periodId: string
  period?: string
  periodStart?: string
  periodEnd?: string
  status: string
  blockers?: { type: string; count: number }[]
  documentsPosted?: number
  documentsPending?: number
  totalMovementValue?: string
  valuationSnapshotId?: string | null
  journalBatchId?: string | null
  notes?: string
  closedAt?: string | null
}

export interface InventoryDashboard {
  items?: number
  activeWarehouses?: number
  batchesExpiring30d?: number
  pendingDocuments?: number
  movements30d?: number
  lowStockItems?: number
  stockValue?: string
}

export function emptyDashboard(): InventoryDashboard {
  return {}
}

/** Accounting unit as returned by the ledger service (used for the unit picker). */
export interface UnitRecord {
  id: string
  code: string
  name: string
  isActive: boolean
  baseCurrencyId: string
}
