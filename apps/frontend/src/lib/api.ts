import type { ApiResponse } from '../types/app';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const DEFAULT_CSRF_COOKIE_NAME = import.meta.env.VITE_CSRF_COOKIE_NAME || 'vox_csrf';

type RequestOptions = RequestInit & {
  headers?: HeadersInit;
};

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

export function setCsrfCookieName(name: string) {
  if (!name) {
    window.sessionStorage.removeItem('vox_csrf_cookie_name');
    return;
  }

  window.sessionStorage.setItem('vox_csrf_cookie_name', name);
}

function getCsrfCookieName() {
  return window.sessionStorage.getItem('vox_csrf_cookie_name') || DEFAULT_CSRF_COOKIE_NAME;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const method = options.method || 'GET';
  const csrfToken = method === 'GET' || method === 'HEAD' ? '' : getCookie(getCsrfCookieName());

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload: ApiResponse<T> = contentType.includes('application/json')
    ? await response.json()
    : { success: response.ok, message: response.statusText, data: {} as T };

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    throw new Error(payload.message || 'Request failed');
  }

  return payload;
}

export const api = {
  get<T>(path: string) {
    return request<T>(path);
  },

  post<T, B = unknown>(path: string, body: B) {
    return request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  patch<T, B = unknown>(path: string, body: B) {
    return request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  delete<T>(path: string) {
    return request<T>(path, {
      method: 'DELETE',
    });
  },
};
