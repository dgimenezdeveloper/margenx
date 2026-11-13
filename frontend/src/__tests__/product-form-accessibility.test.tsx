import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ProductMasterDataForm } from '../components/products/ProductMasterDataForm';
import { CANONICAL_FOCUS_CLASSES } from '../lib/accessibility';

describe('Accesibilidad en ProductMasterDataForm (#361)', () => {
  it('vincula explícitamente etiquetas con sus respectivos inputs mediante htmlFor e id', () => {
    render(
      <ProductMasterDataForm
        name="Pan flauta"
        salePrice={4500}
        minMarginPercent={30}
        onChangeName={vi.fn()}
        onChangeSalePrice={vi.fn()}
        onChangeMinMarginPercent={vi.fn()}
      />
    );

    const nameInput = screen.getByLabelText(/nombre del producto/i);
    const priceInput = screen.getByLabelText(/precio de venta/i);
    const marginInput = screen.getByLabelText(/margen mínimo esperado/i);

    expect(nameInput).toBeDefined();
    expect(nameInput.getAttribute('id')).toBe('product-name');

    expect(priceInput).toBeDefined();
    expect(priceInput.getAttribute('id')).toBe('product-sale-price');

    expect(marginInput).toBeDefined();
    expect(marginInput.getAttribute('id')).toBe('product-min-margin');

    // Comprobación de que input.labels no está vacío
    expect((nameInput as HTMLInputElement).labels?.length).toBeGreaterThan(0);
    expect((priceInput as HTMLInputElement).labels?.length).toBeGreaterThan(0);
    expect((marginInput as HTMLInputElement).labels?.length).toBeGreaterThan(0);
  });

  it('hacer clic en la etiqueta transfiere el foco al input correspondiente', async () => {
    const user = userEvent.setup();
    render(
      <ProductMasterDataForm
        name="Pan flauta"
        salePrice={4500}
        minMarginPercent={30}
        onChangeName={vi.fn()}
        onChangeSalePrice={vi.fn()}
        onChangeMinMarginPercent={vi.fn()}
      />
    );

    const nameLabel = screen.getByText(/nombre del producto/i);
    await user.click(nameLabel);
    expect(document.activeElement).toBe(screen.getByLabelText(/nombre del producto/i));

    const priceLabel = screen.getByText(/precio de venta/i);
    await user.click(priceLabel);
    expect(document.activeElement).toBe(screen.getByLabelText(/precio de venta/i));

    const marginLabel = screen.getByText(/margen mínimo esperado/i);
    await user.click(marginLabel);
    expect(document.activeElement).toBe(screen.getByLabelText(/margen mínimo esperado/i));
  });

  it('aplica las clases canónicas de anillo de foco accesible en todos los campos', () => {
    render(
      <ProductMasterDataForm
        name="Pan flauta"
        salePrice={4500}
        minMarginPercent={30}
        onChangeName={vi.fn()}
        onChangeSalePrice={vi.fn()}
        onChangeMinMarginPercent={vi.fn()}
      />
    );

    const nameInput = screen.getByLabelText(/nombre del producto/i);
    CANONICAL_FOCUS_CLASSES.split(' ').forEach((cls) => {
      expect(nameInput.className).toContain(cls);
    });
  });

  it('omite el campo de margen mínimo al rol colaborador sin romper la accesibilidad del resto', () => {
    render(
      <ProductMasterDataForm
        name="Pan flauta"
        salePrice={4500}
        minMarginPercent={30}
        isCollaborator={true}
        onChangeName={vi.fn()}
        onChangeSalePrice={vi.fn()}
        onChangeMinMarginPercent={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/nombre del producto/i)).toBeDefined();
    expect(screen.getByLabelText(/precio de venta/i)).toBeDefined();
    expect(screen.queryByLabelText(/margen mínimo esperado/i)).toBeNull();
  });
});