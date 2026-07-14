const configuredApiUrl = import.meta.env.VITE_API_URL;

// Use the local API during development, while allowing deployed builds to
// target their public backend through VITE_API_URL.
export const API_URL = (configuredApiUrl || 'http://localhost:5000').replace(/\/$/, '');
