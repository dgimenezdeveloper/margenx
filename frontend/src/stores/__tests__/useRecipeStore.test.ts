import { describe, it, expect, beforeEach } from 'vitest';
import {
  useRecipeStore,
  selectTotalCost,
  selectMarginAmount,
  selectMarginPercent,
  selectIsUnderMargin,
  type RecipeItem,
  type RecipeSelectorState,
} from '../useRecipeStore';

describe('useRecipeStore', () => {
  beforeEach(() => {
    useRecipeStore.getState().reset();
  });

  it('inicializa con valores por defecto consistentes', () => {
    const state = useRecipeStore.getState();
    expect(state.items).toEqual([]);
    expect(state.salePrice).toBe(0);
    expect(state.minMarginPercent).toBe(30);
    expect(state.totalCost()).toBe(0);
    expect(state.marginAmount()).toBe(0);
    expect(state.marginPercent()).toBe(0);
    expect(state.isUnderMargin()).toBe(false);
  });

  describe('setItems', () => {
    it('permite reemplazar la lista completa de ingredientes', () => {
      const mockItems: RecipeItem[] = [
        { ingredientId: 'ing-1', name: 'Harina', unit: 'kg', unitCost: 1000, quantity: 2 },
      ];
      useRecipeStore.getState().setItems(mockItems);
      expect(useRecipeStore.getState().items).toEqual(mockItems);
    });
  });

  describe('addIngredient', () => {
    it('agrega un nuevo insumo a una receta vacía', () => {
      const item: RecipeItem = {
        ingredientId: 'ing-1',
        name: 'Harina 000',
        unit: 'kg',
        unitCost: 800,
        quantity: 0.5,
        recipeUnit: 'gr',
        inputQty: 500,
      };

      useRecipeStore.getState().addIngredient(item);
      const items = useRecipeStore.getState().items;

      expect(items).toHaveLength(1);
      expect(items[0]).toEqual(item);
    });

    it('acumula cantidades cuando se agrega un insumo ya existente', () => {
      const item1: RecipeItem = {
        ingredientId: 'ing-1',
        name: 'Harina 000',
        unit: 'kg',
        unitCost: 800,
        quantity: 0.5,
        recipeUnit: 'gr',
        inputQty: 500,
      };
      const item2: RecipeItem = {
        ingredientId: 'ing-1',
        name: 'Harina 000',
        unit: 'kg',
        unitCost: 800,
        quantity: 0.25,
        recipeUnit: 'gr',
        inputQty: 250,
      };

      useRecipeStore.getState().addIngredient(item1);
      useRecipeStore.getState().addIngredient(item2);

      const items = useRecipeStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(0.75);
      expect(items[0].inputQty).toBe(750);
    });

    it('acumula correctamente cuando el insumo existente no posee inputQty explícito', () => {
      const item1: RecipeItem = {
        ingredientId: 'ing-2',
        name: 'Levadura',
        unit: 'kg',
        unitCost: 6000,
        quantity: 0.05,
      };
      const item2: RecipeItem = {
        ingredientId: 'ing-2',
        name: 'Levadura',
        unit: 'kg',
        unitCost: 6000,
        quantity: 0.05,
      };

      useRecipeStore.getState().addIngredient(item1);
      useRecipeStore.getState().addIngredient(item2);

      const items = useRecipeStore.getState().items;
      expect(items[0].quantity).toBe(0.1);
      expect(items[0].inputQty).toBe(0.1);
    });
  });

  describe('removeIngredient', () => {
    it('elimina un insumo específico por su ID preservando los demás', () => {
      useRecipeStore.getState().setItems([
        { ingredientId: 'ing-1', name: 'Harina', unit: 'kg', unitCost: 800, quantity: 1 },
        { ingredientId: 'ing-2', name: 'Agua', unit: 'l', unitCost: 100, quantity: 0.5 },
      ]);

      useRecipeStore.getState().removeIngredient('ing-1');
      const items = useRecipeStore.getState().items;

      expect(items).toHaveLength(1);
      expect(items[0].ingredientId).toBe('ing-2');
    });
  });

  describe('updateQuantity', () => {
    it('modifica la cantidad, inputQty y unidad de receta del ítem seleccionado', () => {
      useRecipeStore.getState().setItems([
        { ingredientId: 'ing-1', name: 'Harina', unit: 'kg', unitCost: 800, quantity: 1, inputQty: 1000, recipeUnit: 'gr' },
      ]);

      useRecipeStore.getState().updateQuantity('ing-1', 2, 2000, 'gr');
      const item = useRecipeStore.getState().items[0];

      expect(item.quantity).toBe(2);
      expect(item.inputQty).toBe(2000);
      expect(item.recipeUnit).toBe('gr');
    });

    it('preserva inputQty y recipeUnit existentes si no se especifican en la actualización', () => {
      useRecipeStore.getState().setItems([
        { ingredientId: 'ing-1', name: 'Harina', unit: 'kg', unitCost: 800, quantity: 1, inputQty: 1000, recipeUnit: 'gr' },
      ]);

      useRecipeStore.getState().updateQuantity('ing-1', 1.5);
      const item = useRecipeStore.getState().items[0];

      expect(item.quantity).toBe(1.5);
      expect(item.inputQty).toBe(1000);
      expect(item.recipeUnit).toBe('gr');
    });
  });

  describe('setSalePrice y setMinMarginPercent con control de desbordes', () => {
    it('acota el precio de venta entre 0 y el valor monetario máximo de $99.999.999,99', () => {
      useRecipeStore.getState().setSalePrice(5000);
      expect(useRecipeStore.getState().salePrice).toBe(5000);

      useRecipeStore.getState().setSalePrice(-500);
      expect(useRecipeStore.getState().salePrice).toBe(0);

      useRecipeStore.getState().setSalePrice(100_000_000);
      expect(useRecipeStore.getState().salePrice).toBe(99_999_999.99);

      useRecipeStore.getState().setSalePrice(NaN);
      expect(useRecipeStore.getState().salePrice).toBe(0);
    });

    it('acota el margen porcentual mínimo entre 0 y el límite de base de datos de 999.99999%', () => {
      useRecipeStore.getState().setMinMarginPercent(45);
      expect(useRecipeStore.getState().minMarginPercent).toBe(45);

      useRecipeStore.getState().setMinMarginPercent(-10);
      expect(useRecipeStore.getState().minMarginPercent).toBe(0);

      useRecipeStore.getState().setMinMarginPercent(1000);
      expect(useRecipeStore.getState().minMarginPercent).toBe(999.99999);

      useRecipeStore.getState().setMinMarginPercent(Infinity);
      expect(useRecipeStore.getState().minMarginPercent).toBe(0);
    });
  });

  describe('Cálculos financieros reactivos', () => {
    it('totalCost: calcula la sumatoria ponderada de insumos', () => {
      useRecipeStore.getState().setItems([
        { ingredientId: '1', name: 'Insumo A', unit: 'kg', unitCost: 1000, quantity: 2 },
        { ingredientId: '2', name: 'Insumo B', unit: 'l', unitCost: 500, quantity: 1.5 },
      ]);
      expect(useRecipeStore.getState().totalCost()).toBe(2750);
    });

    it('marginAmount: retorna 0 si la receta está vacía o el costo es 0', () => {
      useRecipeStore.getState().setSalePrice(3000);
      expect(useRecipeStore.getState().marginAmount()).toBe(0);

      useRecipeStore.getState().setItems([
        { ingredientId: '1', name: 'Agua de grifo', unit: 'l', unitCost: 0, quantity: 5 },
      ]);
      expect(useRecipeStore.getState().marginAmount()).toBe(0);
    });

    it('marginAmount: calcula la diferencia nominal positiva y negativa (venta a pérdida con salePrice 0)', () => {
      useRecipeStore.getState().setItems([
        { ingredientId: '1', name: 'Carne', unit: 'kg', unitCost: 4000, quantity: 1 },
      ]);
      useRecipeStore.getState().setSalePrice(6000);
      expect(useRecipeStore.getState().marginAmount()).toBe(2000);

      // Caso borde: Producto con receta pero sin precio fijado (salePrice: 0)
      useRecipeStore.getState().setSalePrice(0);
      expect(useRecipeStore.getState().marginAmount()).toBe(-4000);
    });

    it('marginPercent: retorna 0 si no hay receta o si salePrice <= 0', () => {
      useRecipeStore.getState().setSalePrice(5000);
      expect(useRecipeStore.getState().marginPercent()).toBe(0);

      useRecipeStore.getState().setItems([
        { ingredientId: '1', name: 'Insumo', unit: 'u', unitCost: 100, quantity: 2 },
      ]);
      useRecipeStore.getState().setSalePrice(0);
      expect(useRecipeStore.getState().marginPercent()).toBe(0);
    });

    it('marginPercent: calcula el margen porcentual sobre ventas redondeado a 1 decimal', () => {
      useRecipeStore.getState().setItems([
        { ingredientId: '1', name: 'Harina', unit: 'kg', unitCost: 736.25, quantity: 0.65 }, // 478.5625
      ]);
      useRecipeStore.getState().setSalePrice(4332.14);
      // ((4332.14 - 478.5625) / 4332.14) * 100 = 88.953... -> 89.0%
      expect(useRecipeStore.getState().marginPercent()).toBe(89.0);
    });

    it('marginPercent: calcula márgenes negativos ante ventas a pérdida extrema', () => {
      useRecipeStore.getState().setItems([
        { ingredientId: '1', name: 'Insumo Caro', unit: 'kg', unitCost: 10000, quantity: 2 }, // 20000
      ]);
      useRecipeStore.getState().setSalePrice(5000);
      // ((5000 - 20000) / 5000) * 100 = -300%
      expect(useRecipeStore.getState().marginPercent()).toBe(-300);
    });

    it('isUnderMargin: evalúa correctamente el quiebre de umbral', () => {
      useRecipeStore.getState().setMinMarginPercent(35);
      expect(useRecipeStore.getState().isUnderMargin()).toBe(false); // Sin receta

      useRecipeStore.getState().setItems([
        { ingredientId: '1', name: 'Base', unit: 'kg', unitCost: 700, quantity: 1 },
      ]);
      useRecipeStore.getState().setSalePrice(1000); // Margen = 30.0% < 35%
      expect(useRecipeStore.getState().isUnderMargin()).toBe(true);

      useRecipeStore.getState().setSalePrice(2000); // Margen = 65.0% >= 35%
      expect(useRecipeStore.getState().isUnderMargin()).toBe(false);
    });
  });

  describe('Selectores puros', () => {
    it('ejecuta los selectores puros desacoplados del hook', () => {
      const state: RecipeSelectorState = {
        items: [{ ingredientId: '1', name: 'A', unit: 'kg', unitCost: 500, quantity: 2 }],
        salePrice: 2000,
        minMarginPercent: 40,
      };

      expect(selectTotalCost(state)).toBe(1000);
      expect(selectMarginAmount(state)).toBe(1000);
      expect(selectMarginPercent(state)).toBe(50.0);
      expect(selectIsUnderMargin(state)).toBe(false);

      const emptyState: RecipeSelectorState = { items: [], salePrice: 1000, minMarginPercent: 30 };
      expect(selectTotalCost(emptyState)).toBe(0);
      expect(selectMarginAmount(emptyState)).toBe(0);
      expect(selectMarginPercent(emptyState)).toBe(0);
      expect(selectIsUnderMargin(emptyState)).toBe(false);
    });
  });
});