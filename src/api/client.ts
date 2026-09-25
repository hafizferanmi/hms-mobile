import axios, { type AxiosRequestConfig } from 'axios';

import { getStorageItemAsync } from '@/hooks/use-storage-state';

import { triggerUnauthorized } from './auth-events';

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!baseURL) {
  // Fails loudly at import time rather than every request silently hitting
  // a relative URL — see .env for how to set this.
  console.warn(
    'EXPO_PUBLIC_API_BASE_URL is not set — API requests will fail. See mobile-app/.env.',
  );
}

// axios ships `create` as both a default-export member and a named export
// by design; this is the standard usage, not a mix-up.
// eslint-disable-next-line import/no-named-as-default-member
export const apiClient = axios.create({ baseURL });

type StoredSession = { token: string };

// Attaches the signed-in staff's JWT on every request. hms-backend-node's
// getTokenFromHeader() does `header.replace("Bearer: ", "")` — note the
// colon after "Bearer" — so the header has to match that exact (non
// -standard) shape or every authenticated request 401s.
apiClient.interceptors.request.use(async (config) => {
  const raw = await getStorageItemAsync('session');
  if (raw) {
    // Tolerate a corrupt or pre-this-format stored value (e.g. left over
    // from testing before the session payload was real JSON) by treating
    // it as "no session" rather than failing every request, including the
    // login request itself, on a JSON.parse throw.
    try {
      const { token } = JSON.parse(raw) as StoredSession;
      config.headers.Authorization = `Bearer: ${token}`;
    } catch {
      // no-op — request goes out unauthenticated
    }
  }
  return config;
});

// Every hms-backend-node response is wrapped as { success, result, message }
// (see helpers/response.js there) regardless of HTTP status — this unwraps
// that envelope so callers just get `result` back (or a rejected promise
// with the backend's own message on failure), and signs the app out on 401
// instead of leaving every screen to notice on its own.
apiClient.interceptors.response.use(
  (response) => {
    const { success, result, message } = response.data ?? {};
    if (success === false) {
      return Promise.reject(new Error(message || 'Request failed'));
    }
    return result;
  },
  (error) => {
    if (error.response?.status === 401) {
      triggerUnauthorized();
    }
    const message = error.response?.data?.message || error.message || 'Network error';
    return Promise.reject(new Error(message));
  },
);

// axios's own method signatures still say `Promise<AxiosResponse<T>>` — the
// response interceptor above changes what actually resolves at runtime
// (the unwrapped `result`) without axios's types knowing that. These wrap
// each verb with the type callers should actually rely on, so
// src/api/*.ts modules never have to reach for `.data` themselves or lie
// to the type checker one call at a time.
export const apiGet = <T>(url: string, config?: AxiosRequestConfig) =>
  apiClient.get(url, config) as unknown as Promise<T>;

export const apiPost = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  apiClient.post(url, data, config) as unknown as Promise<T>;

export const apiPut = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  apiClient.put(url, data, config) as unknown as Promise<T>;

export const apiDelete = <T>(url: string, config?: AxiosRequestConfig) =>
  apiClient.delete(url, config) as unknown as Promise<T>;
