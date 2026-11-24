import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // VITE_API_BASE_URL is canonical. Keep a compatibility fallback for the
  // previously configured CRA-style Vercel variable during migration.
  const apiBaseUrl = (env.VITE_API_BASE_URL || env.REACT_APP_API_BASE_URL)?.trim();
  if (apiBaseUrl) {
    let url;
    try { url = new URL(apiBaseUrl); } catch { /* Report invalid configuration below. */ }
    const localDev = mode === 'development' && url?.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (!url || (url.protocol !== 'https:' && !localDev) || url.username || url.password ||
        url.search || url.hash || !/^\/api\/?$/.test(url.pathname)) {
      throw new Error('Set VITE_API_BASE_URL to the HTTPS backend URL ending in /api.');
    }
  }

  return {
    define: {
      // import.meta.env only exposes VITE_* variables by default. Inject the
      // resolved value so legacy REACT_APP_API_BASE_URL builds use the same
      // API client path as canonical VITE builds.
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(apiBaseUrl || ''),
    },
    server: { proxy: apiBaseUrl ? {} : { '/api': 'http://127.0.0.1:3000' } },
  };
});
