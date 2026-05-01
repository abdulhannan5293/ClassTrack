import { useAuthStore } from '@/stores/auth-store';

// This MUST be called outside React components (not hooks)
// We'll use zustand's getState() to read/write auth state

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token!);
    }
  });
  failedQueue = [];
};

export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const { accessToken, refreshToken, logout, setAuth, user } =
    useAuthStore.getState();

  if (!accessToken) {
    logout();
    throw new Error('Not authenticated');
  }

  // Add auth header
  const headers = new Headers(options.headers);
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...options, headers });

  // If 401, try to refresh token
  if (response.status === 401 && refreshToken) {
    if (isRefreshing) {
      // Queue this request while another refresh is in progress
      return new Promise<Response>((resolve, reject) => {
        failedQueue.push({
          resolve: (newToken: string) => {
            const retryHeaders = new Headers(options.headers);
            retryHeaders.set('Authorization', `Bearer ${newToken}`);
            fetch(url, { ...options, headers: retryHeaders })
              .then(resolve)
              .catch(reject);
          },
          reject,
        });
      });
    }

    isRefreshing = true;

    try {
      const refreshRes = await fetch('/api/auth/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!refreshRes.ok) {
        // Refresh failed - log out
        processQueue(new Error('Refresh failed'), null);
        logout();
        throw new Error('Session expired. Please log in again.');
      }

      const data = await refreshRes.json();
      const newAccessToken = data.accessToken;
      const newRefreshToken = data.refreshToken;

      // Update auth store with new tokens
      if (user) {
        setAuth(user, newAccessToken, newRefreshToken);
      }

      processQueue(null, newAccessToken);

      // Retry the original request with new token
      const retryHeaders = new Headers(options.headers);
      retryHeaders.set('Authorization', `Bearer ${newAccessToken}`);
      return fetch(url, { ...options, headers: retryHeaders });
    } catch (error) {
      processQueue(error instanceof Error ? error : new Error('Refresh failed'), null);
      logout();
      throw error;
    } finally {
      isRefreshing = false;
    }
  }

  return response;
}
