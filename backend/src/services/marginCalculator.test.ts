import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  calculateItemCost,
  calculateRecipeTotal,
  calculateMarginAmount,
  calculateMarginPercent,
} from './marginCalculator';

const D = Prisma.Decimal;

describe('marginCalculator (unit)', () => {
  it('calculates single item cost precisely and rounds to 2 decimals (no float artifacts)', () => {
    const unitCost = new D('742.98');
    const quantity = new D('0.125');
    const result = calculateItemCost(quantity, unitCost);
    expect(result.toFixed(2)).toBe('92.87');
  });

  it('returns 0.00 for empty recipe', () => {
    const total = calculateRecipeTotal([]);
    expect(total.toFixed(2)).toBe('0.00');
  });

  it('sums multiple items and rounds final total', () => {
    const items = [
      { quantity: new D('1'), unitCost: new D('10.005') },
      { quantity: new D('2'), unitCost: new D('0.3333') },
    ];
    const total = calculateRecipeTotal(items);
    // Compute expected: 10.005*1 + 0.3333*2 = 10.005 + 0.6666 = 10.6716 -> 10.67
    expect(total.toFixed(2)).toBe('10.67');
  });

  it('handles periodic numbers (1/3) without losing precision on rounding', () => {
    const unit = new D('1');
    const quantity = new D('0.333333333333333333');
    const itemCost = calculateItemCost(quantity, unit);
    // 1 * 0.3333... => 0.3333... -> rounded to 0.33
    expect(itemCost.toFixed(2)).toBe('0.33');
  });

  it('small quantities round to 0.00 when below cent precision', () => {
    const unit = new D('0.005');
    const quantity = new D('0.001');
    const cost = calculateItemCost(quantity, unit);
    expect(cost.toFixed(2)).toBe('0.00');
  });

  it('calculates margin amount and percent for positive sale price', () => {
    const sale = new D('100.00');
    const cost = new D('20.00');
    const amount = calculateMarginAmount(sale, cost);
    const percent = calculateMarginPercent(sale, cost);
    expect(amount.toFixed(2)).toBe('80.00');
    expect(percent.toFixed(2)).toBe('80.00');
  });

  it('handles salePrice = 0 safely: percent 0.00 and negative margin amount', () => {
    const sale = new D('0.00');
    const cost = new D('1500.00');
    const amount = calculateMarginAmount(sale, cost);
    const percent = calculateMarginPercent(sale, cost);
    expect(amount.toFixed(2)).toBe('-1500.00');
    expect(percent.toFixed(2)).toBe('0.00');
  });

  it('returns 0.00 percent when totalCost is zero (no ingredients)', () => {
    const sale = new D('50.00');
    const cost = new D('0.00');
    const percent = calculateMarginPercent(sale, cost);
    expect(percent.toFixed(2)).toBe('0.00');
  });
});
