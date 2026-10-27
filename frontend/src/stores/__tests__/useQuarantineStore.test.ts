import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useQuarantineStore } from '../useQuarantineStore';
import { supplierService, type QuarantinedItem } from '@/services/supplierService';

vi.mock('@/services/supplierService', () => ({
  supplierService: {
    getQuarantine: vi.fn(),
  },
}));

describe('useQuarantineStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useQuarantineStore.setState({ items: [], isLoading: true, error: null });
  });

  it('fetchItems: actualiza el listado y finaliza la carga en caso exitoso', async () => {
    const mockItems: QuarantinedItem[] = [
      {
        id: 'q-1',
        ingredientId: 'ing-1',
        supplierId: 'sup-1',
        packagePrice: 50000,
        packageSize: 25,
        currentPrice: 28000,
        proposedPrice: 50000,
        quarantineReason: 'VARIACION_MAYOR_50_POR_CIENTO',
        isDefault: true,
        isQuarantined: true,
        ingredient: { id: 'ing-1', name: 'Cacao amargo', currentCost: 1120 },
        supplier: { id: 'sup-1', name: 'Distribuidora Central' },
      },
    ];

    vi.mocked(supplierService.getQuarantine).mockResolvedValueOnce(mockItems);

    const getToken = vi.fn().mockResolvedValue('token-123');
    await useQuarantineStore.getState().fetchItems(getToken);

    const state = useQuarantineStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.items).toEqual(mockItems);
    expect(supplierService.getQuarantine).toHaveBeenCalledWith(getToken);
  });

  it('fetchItems: captura y maneja errores de tipo Error', async () => {
    vi.mocked(supplierService.getQuarantine).mockRejectedValueOnce(new Error('Fallo de red'));

    const getToken = vi.fn().mockResolvedValue('token-123');
    await useQuarantineStore.getState().fetchItems(getToken);

    const state = useQuarantineStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('Fallo de red');
    expect(state.items).toEqual([]);
  });

  it('fetchItems: maneja excepciones que no heredan de Error', async () => {
    vi.mocked(supplierService.getQuarantine).mockRejectedValueOnce('Error inesperado string');

    const getToken = vi.fn().mockResolvedValue('token-123');
    await useQuarantineStore.getState().fetchItems(getToken);

    const state = useQuarantineStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('Error al cargar la cuarentena');
  });

  it('removeItemLocally: remueve el ítem de la bandeja en memoria sin refetch', () => {
    const items: QuarantinedItem[] = [
      {
        id: 'q-1',
        ingredientId: 'ing-1',
        supplierId: 'sup-1',
        packagePrice: 10000,
        packageSize: 10,
        isDefault: true,
        isQuarantined: true,
        ingredient: { id: 'ing-1', name: 'Harina', currentCost: 1000 },
        supplier: { id: 'sup-1', name: 'Proveedor A' },
      },
      {
        id: 'q-2',
        ingredientId: 'ing-2',
        supplierId: 'sup-1',
        packagePrice: 20000,
        packageSize: 10,
        isDefault: true,
        isQuarantined: true,
        ingredient: { id: 'ing-2', name: 'Azúcar', currentCost: 2000 },
        supplier: { id: 'sup-1', name: 'Proveedor A' },
      },
    ];

    useQuarantineStore.setState({ items });

    useQuarantineStore.getState().removeItemLocally('q-1');

    const state = useQuarantineStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].id).toBe('q-2');
  });
});