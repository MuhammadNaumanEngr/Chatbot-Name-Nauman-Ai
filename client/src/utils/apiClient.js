const API_BASE = '/api';

let logoutCallback = null;
let showRateLimitToast = null;

export function setLogoutCallback(cb) {
  logoutCallback = cb;
}

export function setRateLimitToastCallback(cb) {
  showRateLimitToast = cb;
}

class ApiError extends Error {
  constructor(message, status, requestId) {
    super(message);
    this.status = status;
    this.requestId = requestId;
    this.name = 'ApiError';
  }
}

async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
  const noRetryStatuses = [400, 401, 403, 404, 409, 429];

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        credentials: 'include'
      });

      if (response.status === 429) {
        const data = await response.json();
        const retryAfter = data.retryAfter || 60;
        if (showRateLimitToast) {
          let remaining = retryAfter;
          const interval = setInterval(() => {
            remaining--;
            if (remaining <= 0) {
              clearInterval(interval);
              if (showRateLimitToast) showRateLimitToast(0);
            } else {
              if (showRateLimitToast) showRateLimitToast(remaining);
            }
          }, 1000);
          showRateLimitToast(retryAfter);
        }
        throw new ApiError(data.error || 'Rate limited', 429);
      }

      if (response.status === 401) {
        if (logoutCallback) logoutCallback();
        throw new ApiError('Not authenticated', 401);
      }

      if (!response.ok && noRetryStatuses.includes(response.status)) {
        const data = await response.json().catch(() => ({}));
        const requestId = response.headers.get('X-Request-Id') || data.requestId;
        throw new ApiError(data.error || data.errors?.[0]?.message || 'Request failed', response.status, requestId);
      }

      if (!response.ok && attempt < retries) {
        await new Promise(r => setTimeout(r, delay * Math.pow(2, attempt)));
        continue;
      }

      return response;
    } catch (err) {
      if (attempt === retries || err.name === 'ApiError' || !navigator.onLine) {
        throw err;
      }
      await new Promise(r => setTimeout(r, delay * Math.pow(2, attempt)));
    }
  }
}

export async function apiClient(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const response = await fetchWithRetry(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  }, 3, 1000);

  if (!response.ok) {
    let error;
    let errorText = '';
    try {
      const data = await response.json();
      const requestId = response.headers.get('X-Request-Id') || data.requestId;
      errorText = data.error || data.errors?.[0]?.message || 'Request failed';
      error = new ApiError(errorText, response.status, requestId);
    } catch {
      errorText = response.statusText || 'Request failed';
      error = new ApiError(errorText, response.status);
    }
    console.error(`API Error ${response.status}:`, errorText, 'on', endpoint);
    throw error;
  }

  return response.json();
}

export default apiClient;