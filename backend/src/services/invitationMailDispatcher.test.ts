import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { dispatchInvitationEmail, type InvitationEmail } from './invitationMailDispatcher';

const INVITATION: InvitationEmail = {
  email: 'cajera.quimica@seed.example.test',
  tradeName: 'Química GyJ',
  inviterEmail: 'admin.quimica@seed.example.test',
  invitationUrl: 'https://possible-alpaca-7097.clerk.accounts.dev/v1/tickets/accept?ticket=ticket_quimica',
};

describe('dispatchInvitationEmail', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env.N8N_INVITATION_WEBHOOK_URL = 'https://n8n.example.test/webhook/collaborator-invitation';
    process.env.INTERNAL_WEBHOOK_SECRET = 'secreto-de-prueba';
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    delete process.env.N8N_INVITATION_WEBHOOK_URL;
    delete process.env.INTERNAL_WEBHOOK_SECRET;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('despacha a n8n con el secreto, un timeout de 5 s, y devuelve true si n8n responde 2xx', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    await expect(dispatchInvitationEmail(INVITATION)).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://n8n.example.test/webhook/collaborator-invitation');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      'x-margenx-webhook-secret': 'secreto-de-prueba',
    });
    expect(JSON.parse(init.body)).toEqual({ ...INVITATION, expiresInDays: 30 });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('devuelve false sin llamar a n8n si falta la URL del webhook (por ejemplo, en local)', async () => {
    delete process.env.N8N_INVITATION_WEBHOOK_URL;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(dispatchInvitationEmail(INVITATION)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fail-closed: sin secreto no despacha y lo registra', async () => {
    delete process.env.INTERNAL_WEBHOOK_SECRET;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(dispatchInvitationEmail(INVITATION)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('INTERNAL_WEBHOOK_SECRET'));
  });

  it('devuelve false si n8n responde con error, sin registrar el enlace de la invitación', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(dispatchInvitationEmail(INVITATION)).resolves.toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('500'));
    const logged = errorSpy.mock.calls.flat().map(String).join(' ');
    expect(logged).not.toContain('ticket_quimica');
  });

  it('devuelve false si falla la red o vence el timeout', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('timeout', 'TimeoutError')));

    await expect(dispatchInvitationEmail(INVITATION)).resolves.toBe(false);
    const logged = errorSpy.mock.calls.flat().map(String).join(' ');
    expect(logged).not.toContain('ticket_quimica');
  });
});
