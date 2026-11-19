import { fetchApi, type TokenGetter } from './api'

export interface PurchasingPresentationSummary {
  supplierIngredientId: string
  supplierId: string
  supplierName: string
  supplierCode: string | null
  rawDescription: string | null
  packageSize: string
  packageUnit: string
  packagePrice: string
  unitCost: string
}

export interface IngredientPurchasingSuggestion {
  ingredientId: string
  ingredientName: string
  unit: string
  currentCost: string
  defaultPresentation: PurchasingPresentationSummary
  cheapestPresentation: PurchasingPresentationSummary
  savingsPerUnit: string
  savingsPercent: string
  packageSavings: string
}

export interface SupplierSuggestionItem {
  ingredientId: string
  ingredientName: string
  unit: string
  supplierIngredientId: string
  supplierCode: string | null
  rawDescription: string | null
  packageSize: string
  packageUnit: string
  packagePrice: string
  unitCost: string
  defaultUnitCost: string
  defaultSupplierName: string
  savingsPerUnit: string
  savingsPercent: string
  packageSavings: string
}

export interface SupplierSuggestionGroup {
  supplierId: string
  supplierName: string
  contactPhone: string | null
  email: string | null
  address: string | null
  itemsCount: number
  totalPackageSavings: string
  items: SupplierSuggestionItem[]
}

export interface AlreadyBestPriceItem {
  ingredientId: string
  ingredientName: string
  unit: string
  unitCost: string
  defaultPresentation: PurchasingPresentationSummary
}

export interface SingleSupplierItem {
  ingredientId: string
  ingredientName: string
  unit: string
  presentation: PurchasingPresentationSummary
}

export interface QuarantinedExcludedItem {
  supplierIngredientId: string
  supplierId: string
  ingredientId: string
  ingredientName: string
  unit: string
  supplierName: string
  packageSize: string
  packageUnit: string
  packagePrice: string
  pendingPackagePrice: string | null
  quarantineReason: string | null
  quarantinedAt: string | null
  isDefault: boolean
}

export interface PurchasingSuggestionsResponse {
  summary: {
    withSavingsCount: number
    alreadyBestPriceCount: number
    singleSupplierCount: number
    withoutEligibleSupplierCount: number
    withoutActiveDefaultCount: number
    quarantinedExcludedCount: number
  }
  byIngredient: IngredientPurchasingSuggestion[]
  bySupplier: SupplierSuggestionGroup[]
  alreadyBestPrice: AlreadyBestPriceItem[]
  singleSupplier: SingleSupplierItem[]
  quarantinedExcluded: QuarantinedExcludedItem[]
}

export interface OrderPreviewItemInput {
  supplierIngredientId: string
  packages: number
}

export interface OrderPreviewLine {
  supplierIngredientId: string
  ingredientId: string
  ingredientName: string
  unit: string
  supplierCode: string | null
  rawDescription: string | null
  packageSize: string
  packageUnit: string
  packagePrice: string
  unitCost: string
  packages: number
  totalQuantity: string
  subtotal: string
  defaultUnitCost: string | null
  savings: string
}

export interface OrderPreviewSupplierGroup {
  supplierId: string
  supplierName: string
  contactPhone: string | null
  email: string | null
  address: string | null
  subtotal: string
  savings: string
  items: OrderPreviewLine[]
}

export interface OrderPreviewResponse {
  groups: OrderPreviewSupplierGroup[]
  total: string
  totalSavings: string
  totalPackages: number
  itemsCount: number
}

export const purchasingService = {
  async getSuggestions(getToken: TokenGetter): Promise<PurchasingSuggestionsResponse> {
    return fetchApi<PurchasingSuggestionsResponse>('/purchasing/suggestions', getToken)
  },

  async previewOrder(
    getToken: TokenGetter,
    items: OrderPreviewItemInput[]
  ): Promise<OrderPreviewResponse> {
    return fetchApi<OrderPreviewResponse>('/purchasing/order-preview', getToken, {
      method: 'POST',
      body: JSON.stringify({ items }),
    })
  },
}