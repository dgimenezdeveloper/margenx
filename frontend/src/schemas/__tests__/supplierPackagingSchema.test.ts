import { describe, it, expect } from 'vitest';
import { supplierPackagingSchema } from '../supplierPackagingSchema';

describe('supplierPackagingSchema', () => {
  it('valida empaques mayoristas correctos y aplica isDefault: false por defecto', () => {
    const valid = {
      supplierId: 'sup-molino-123',
      packageSize: 25,
      packagePrice: 18406.25,
    };
    const parsed = supplierPackagingSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.isDefault).toBe(false);
    }
  });

  it('acepta marcar la presentación como predeterminada', () => {
    const parsed = supplierPackagingSchema.safeParse({
      supplierId: 'sup-1',
      packageSize: 50,
      packagePrice: 35000,
      isDefault: true,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.isDefault).toBe(true);
    }
  });

  it('rechaza proveedor ausente o vacío', () => {
    const noSupplier = supplierPackagingSchema.safeParse({
      supplierId: '',
      packageSize: 25,
      packagePrice: 10000,
    });
    expect(noSupplier.success).toBe(false);
    if (!noSupplier.success) {
      expect(noSupplier.error.issues[0].message).toBe('Debes seleccionar un proveedor');
    }
  });

  it('rechaza bultos con tamaño o precio menor o igual a cero', () => {
    expect(supplierPackagingSchema.safeParse({ supplierId: 's1', packageSize: 0, packagePrice: 100 }).success).toBe(false);
    expect(supplierPackagingSchema.safeParse({ supplierId: 's1', packageSize: -5, packagePrice: 100 }).success).toBe(false);
    expect(supplierPackagingSchema.safeParse({ supplierId: 's1', packageSize: 10, packagePrice: 0 }).success).toBe(false);
    expect(supplierPackagingSchema.safeParse({ supplierId: 's1', packageSize: 10, packagePrice: -500 }).success).toBe(false);
  });

  it('rechaza desbordes numéricos por encima de 99.999.999,99', () => {
    expect(supplierPackagingSchema.safeParse({ supplierId: 's1', packageSize: 100_000_000, packagePrice: 100 }).success).toBe(false);
    expect(supplierPackagingSchema.safeParse({ supplierId: 's1', packageSize: 10, packagePrice: 100_000_000 }).success).toBe(false);
  });
});