import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { hasActiveBrowserSession } from '../utils/browserSession';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
const timeout = Number(import.meta.env.VITE_API_TIMEOUT) || 10000;

export const axiosInstance = axios.create({
  baseURL,
  timeout,
  // Sends the HTTP-only refresh cookie on same-site/credentialed requests.
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

axiosInstance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Single-flight refresh: concurrent 401s all wait on the same promise
// instead of hammering /auth/refresh in parallel. This is exported so
// useSessionBootstrap can share it too — the backend rotates the refresh
// token on every call, so two independent concurrent refresh requests
// (e.g. one from here, one from bootstrap) racing on the same
// not-yet-rotated cookie makes the backend's reuse-detection logic treat
// the second, legitimate request as token theft and revoke the whole
// session family, including the one the first request just created.
let refreshPromise: Promise<string> | null = null;

export async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ accessToken: string; user: { id: string; email: string; role: 'USER' | 'ADMIN' } }>(
        `${baseURL}/auth/refresh`,
        {},
        { withCredentials: true },
      )
      .then((res) => {
        useAuthStore.getState().setSession(res.data.accessToken, res.data.user);
        return res.data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryableConfig | undefined;

    if (
      error.response?.status === 401
      && original
      && !original._retry
      && !original.url?.includes('/auth/')
      && hasActiveBrowserSession()
    ) {
      original._retry = true;
      try {
        const newToken = await refreshAccessToken();
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(original);
      } catch {
        useAuthStore.getState().clearSession();
        // The refresh cookie is invalid or expired. A hard navigation clears
        // the unusable authenticated React tree and prevents the user from
        // being left on a dashboard that can scroll but cannot perform any
        // authenticated action.
        if (window.location.pathname !== '/login') {
          window.location.replace('/login?reason=session_expired');
        }
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
