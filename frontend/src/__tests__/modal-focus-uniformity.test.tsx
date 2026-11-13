import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BulkIngredientsModal } from '../components/supplies/BulkIngredientsModal';
import { CANONICAL_FOCUS_CLASSES } from '../lib/accessibility';

describe('Uniformidad de Anillo de Foco en Modales (#361)', () => {
  it('aplica el estilo de foco canónico a pestañas y botones del modal de carga por planilla', () => {
    render(
      <BulkIngredientsModal open={true} onOpenChange={vi.fn()} onSuccess={vi.fn()} />
    );

    const closeBtn = screen.getByLabelText(/cerrar modal de importación/i);
    const templateBtn = screen.getByRole('button', { name: /descargar plantilla/i });
    const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
    const confirmBtn = screen.getByRole('button', { name: /confirmar/i });
    const validTab = screen.getByRole('tab', { name: /válidas/i });

    const expectedClasses = CANONICAL_FOCUS_CLASSES.split(' ');

    [closeBtn, templateBtn, cancelBtn, confirmBtn, validTab].forEach((element) => {
      expectedClasses.forEach((cls) => {
        expect(element.className).toContain(cls);
      });
    });
  });

  it('los paneles de pestañas poseen la semántica ARIA correspondiente', () => {
    render(
      <BulkIngredientsModal open={true} onOpenChange={vi.fn()} onSuccess={vi.fn()} />
    );

    const validTab = screen.getByRole('tab', { name: /válidas/i });
    expect(validTab.getAttribute('aria-selected')).toBe('true');
    expect(validTab.getAttribute('aria-controls')).toBe('panel-valid');

    const panel = screen.getByRole('tabpanel');
    expect(panel.getAttribute('id')).toBe('panel-valid');
    expect(panel.getAttribute('aria-labelledby')).toBe('tab-valid');
  });
});