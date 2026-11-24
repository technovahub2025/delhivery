import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBaseUrl = env.VITE_API_BASE_URL?.trim();
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

  return { server: { proxy: apiBaseUrl ? {} : { '/api': 'http://127.0.0.1:3000' } } };
});
