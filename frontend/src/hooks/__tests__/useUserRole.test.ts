import { describe, it, expect, vi } from 'vitest';
import { useUserRole } from '../useUserRole';
import { useCurrentUser } from '@/lib/useCurrentUser';

vi.mock('@/lib/useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}));

describe('useUserRole hook', () => {
  it('resuelve correctamente privilegios para rol ADMIN', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      user: { id: 'u-1', email: 'admin@panaderia.com', role: 'ADMIN', accountId: 'acc-1' },
      isLoading: false,
      businessName: 'Panadería Central',
      defaultMinMarginPercent: 30,
      refreshUser: vi.fn(),
    });

    const result = useUserRole();
    expect(result.role).toBe('ADMIN');
    expect(result.isAdmin).toBe(true);
    expect(result.isCollaborator).toBe(false);
    expect(result.isLoading).toBe(false);
  });

  it('resuelve correctamente restricciones para rol COLLABORATOR', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      user: { id: 'u-2', email: 'cajero@panaderia.com', role: 'COLLABORATOR', accountId: 'acc-1' },
      isLoading: false,
      businessName: 'Panadería Central',
      defaultMinMarginPercent: 30,
      refreshUser: vi.fn(),
    });

    const result = useUserRole();
    expect(result.role).toBe('COLLABORATOR');
    expect(result.isAdmin).toBe(false);
    expect(result.isCollaborator).toBe(true);
    expect(result.isLoading).toBe(false);
  });

  it('maneja estados de carga sin usuario resuelto', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      user: null,
      isLoading: true,
      businessName: undefined,
      defaultMinMarginPercent: 30,
      refreshUser: vi.fn(),
    });

    const result = useUserRole();
    expect(result.role).toBeNull();
    expect(result.isAdmin).toBe(false);
    expect(result.isCollaborator).toBe(false);
    expect(result.isLoading).toBe(true);
  });
});