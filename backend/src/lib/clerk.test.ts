import { describe, it, expect, vi } from 'vitest';

const createClerkClientMock = vi.fn(() => ({ invitations: {}, users: {} }));
vi.mock('@clerk/backend', () => ({
  createClerkClient: (...args: unknown[]) => createClerkClientMock(...(args as [])),
}));

import { getClerkClient } from './clerk';

describe('getClerkClient', () => {
  it('crea el cliente una sola vez, con la clave secreta del entorno', () => {
    process.env.CLERK_SECRET_KEY = 'sk_test_quimica_gyj';

    const first = getClerkClient();
    const second = getClerkClient();

    expect(first).toBe(second);
    expect(createClerkClientMock).toHaveBeenCalledTimes(1);
    expect(createClerkClientMock).toHaveBeenCalledWith({ secretKey: 'sk_test_quimica_gyj' });
  });
});
