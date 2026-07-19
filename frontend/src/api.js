export const API_URL = import.meta.env.VITE_API_URL;

let accessToken = localStorage.getItem('pharmatrack_token') || null;
let refreshTokenValue = localStorage.getItem('pharmatrack_refresh') || null;

export const setTokens = (token, refreshToken) => {
  accessToken = token;
  refreshTokenValue = refreshToken;
  if (token) {
    localStorage.setItem('pharmatrack_token', token);
  } else {
    localStorage.removeItem('pharmatrack_token');
  }
  if (refreshToken) {
    localStorage.setItem('pharmatrack_refresh', refreshToken);
  } else {
    localStorage.removeItem('pharmatrack_refresh');
  }
};

export const getAccessToken = () => accessToken;
export const getRefreshToken = () => refreshTokenValue;

export const clearTokens = () => {
  accessToken = null;
  refreshTokenValue = null;
  localStorage.removeItem('pharmatrack_token');
  localStorage.removeItem('pharmatrack_refresh');
  localStorage.removeItem('pharmatrack_user');
};

export const getUser = () => {
  try {
    const raw = localStorage.getItem('pharmatrack_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setUser = (user) => {
  if (user) {
    localStorage.setItem('pharmatrack_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('pharmatrack_user');
  }
};

export const authFetch = async (url, options = {}) => {
  const headers = { ...options.headers };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let response = await fetch(url, { ...options, headers });

  if (response.status === 401 && refreshTokenValue) {
    try {
      const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refreshTokenValue }),
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setTokens(data.token, refreshTokenValue);
        headers['Authorization'] = `Bearer ${data.token}`;
        response = await fetch(url, { ...options, headers });
      } else {
        clearTokens();
        window.location.reload();
      }
    } catch {
      clearTokens();
      window.location.reload();
    }
  }

  return response;
};
