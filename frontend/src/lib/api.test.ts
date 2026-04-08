import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL, api, setCsrfCookieName } from './api';

const originalFetch = global.fetch;

describe('api', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        window.sessionStorage.clear();
        document.cookie = 'vox_csrf=token123';
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('adds csrf header for mutating requests', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            headers: { get: () => 'application/json' },
            json: async () => ({ success: true, data: { ok: true } }),
        } as Response);

        await api.post('/messages', { hello: 'world' });

        expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/messages`, expect.objectContaining({
            method: 'POST',
            credentials: 'include',
            headers: expect.objectContaining({
                'Content-Type': 'application/json',
                'X-CSRF-Token': 'token123',
            }),
            body: JSON.stringify({ hello: 'world' }),
        }));
    });

    it('omits csrf header for get requests', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            headers: { get: () => 'application/json' },
            json: async () => ({ success: true, data: { ok: true } }),
        } as Response);

        await api.get('/bootstrap');

        expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/bootstrap`, expect.objectContaining({
            headers: expect.not.objectContaining({
                'X-CSRF-Token': expect.anything(),
            }),
        }));
    });

    it('stores and clears a custom csrf cookie name', () => {
        setCsrfCookieName('custom_csrf');
        expect(window.sessionStorage.getItem('vox_csrf_cookie_name')).toBe('custom_csrf');

        setCsrfCookieName('');
        expect(window.sessionStorage.getItem('vox_csrf_cookie_name')).toBeNull();
    });

    it('dispatches unauthorized event on 401 responses', async () => {
        const onUnauthorized = vi.fn();
        window.addEventListener('auth:unauthorized', onUnauthorized);

        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            headers: { get: () => 'application/json' },
            json: async () => ({ success: false, message: 'Unauthorized', data: {} }),
        } as Response);

        await expect(api.delete('/session')).rejects.toThrow('Unauthorized');
        expect(onUnauthorized).toHaveBeenCalledTimes(1);

        window.removeEventListener('auth:unauthorized', onUnauthorized);
    });

    it('falls back to status text for non-json failures', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Server Error',
            headers: { get: () => 'text/plain' },
        } as Response);

        await expect(api.patch('/profile', { name: 'Alex' })).rejects.toThrow('Server Error');
    });
});
