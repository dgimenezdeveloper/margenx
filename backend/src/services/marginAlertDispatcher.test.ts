import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { dispatchMarginAlertEvent } from './marginAlertDispatcher';

const accountFindUniqueMock = vi.fn();

vi.mock('../lib/prisma', () => ({
    prisma: {
        account: {
            findUnique: (...args: unknown[]) => accountFindUniqueMock(...args),
        },
    },
}));

describe('dispatchMarginAlertEvent', () => {
    beforeEach(() => {
        process.env.N8N_MARGIN_ALERT_WEBHOOK_URL = 'https://n8n.example.test/webhook/margins';
        process.env.INTERNAL_WEBHOOK_SECRET = 'test-secret';
        accountFindUniqueMock.mockReset();
    });

    afterEach(() => {
        delete process.env.N8N_MARGIN_ALERT_WEBHOOK_URL;
        delete process.env.INTERNAL_WEBHOOK_SECRET;
        vi.unstubAllGlobals();
    });

    it('selecciona el ADMIN más antiguo y usa timeout de 5s al despachar la alerta', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            statusText: 'OK',
        });
        vi.stubGlobal('fetch', fetchMock);

        accountFindUniqueMock.mockResolvedValue({
            businessName: 'Panadería Central',
            slug: 'panaderia-central',
            users: [
                { email: 'admin2@panaderia.com' },
                { email: 'admin1@panaderia.com' },
            ],
        });

        await dispatchMarginAlertEvent({
            accountId: 'acc-1',
            ingredientId: 'ing-1',
            ingredientName: 'Harina 000',
            affectedProductsCount: 2,
            criticalProducts: [
                {
                    productId: 'prod-1',
                    productName: 'Pan flauta',
                    previousCost: '50.00',
                    newCost: '9500.00',
                    currentMarginPercent: '10.00',
                    minMarginPercent: '30.00',
                },
            ],
        });

        expect(accountFindUniqueMock).toHaveBeenCalledWith({
            where: { id: 'acc-1' },
            select: {
                businessName: true,
                slug: true,
                users: {
                    where: { role: 'ADMIN' },
                    orderBy: { createdAt: 'asc' },
                    select: { email: true },
                    take: 1,
                },
            },
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);

        const firstCall = fetchMock.mock.calls[0];
        expect(firstCall).toBeDefined();

        const requestInit = firstCall?.[1] as RequestInit | undefined;
        expect(requestInit).toEqual(
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                    'User-Agent': 'MargenX-Backend-Dispatcher/1.0',
                    'x-margenx-webhook-secret': 'test-secret',
                }),
            })
        );
        expect(requestInit?.signal).toBeInstanceOf(AbortSignal);
    });
});
