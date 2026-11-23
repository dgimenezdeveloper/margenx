import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFeatures } from '../useFeatures';
import { useCurrentUser } from '@/lib/useCurrentUser';

vi.mock('@/lib/useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}));

type CurrentUser = ReturnType<typeof useCurrentUser>;

function mockCurrentUser(overrides: Partial<CurrentUser>) {
  vi.mocked(useCurrentUser).mockReturnValue({
    user: null,
    isLoading: false,
    businessName: undefined,
    defaultMinMarginPercent: 30,
    refreshUser: vi.fn(),
    ...overrides,
  });
}

describe('useFeatures (ADR-010)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('prende el módulo de ventas si /api/auth/me lo informa', () => {
    mockCurrentUser({
      user: {
        id: '31d00001-0000-4000-8000-000000000001',
        email: 'demo-admin@margenx.tech',
        role: 'ADMIN',
        accountId: '31a00000-0000-4000-8000-000000000001',
        features: { sales: true },
      },
      businessName: 'Demo MargenX',
    });

    const result = useFeatures();

    expect(result.features).toEqual({ sales: true });
    expect(result.hasFeature('sales')).toBe(true);
    expect(result.isLoading).toBe(false);
  });

  it('lo deja apagado si la cuenta no tiene el módulo', () => {
    mockCurrentUser({
      user: { id: 'u-1', email: 'admin@panaderia-central.example', role: 'ADMIN', accountId: 'acc-1', features: { sales: false } },
      businessName: 'Panadería Central',
    });

    expect(useFeatures().hasFeature('sales')).toBe(false);
  });

  it('el colaborador ve el módulo de su cuenta', () => {
    mockCurrentUser({
      user: {
        id: '31d00001-0000-4000-8000-000000000002',
        email: 'demo-colab@margenx.tech',
        role: 'COLLABORATOR',
        accountId: '31a00000-0000-4000-8000-000000000001',
        features: { sales: true },
      },
    });

    expect(useFeatures().hasFeature('sales')).toBe(true);
  });

  it('apaga todo mientras carga o si la respuesta no trae features (API anterior)', () => {
    mockCurrentUser({ user: null, isLoading: true });
    const loading = useFeatures();
    expect(loading.features).toEqual({ sales: false });
    expect(loading.hasFeature('sales')).toBe(false);
    expect(loading.isLoading).toBe(true);

    mockCurrentUser({ user: { id: 'u-1', email: 'admin@quimica-gyj.example', role: 'ADMIN', accountId: 'acc-2' } });
    expect(useFeatures().hasFeature('sales')).toBe(false);
  });
});
