import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBaseUrl = (
    env.VITE_API_BASE_URL ||
    env.REACT_APP_API_BASE_URL ||
    'https://delhivery-backebnd.onrender.com/api'
  ).trim();

  if (!/^https?:\/\//i.test(apiBaseUrl)) {
    throw new Error('Set VITE_API_BASE_URL to the full backend API URL, including /api.');
  }

  return {
    define: {
      'process.env.REACT_APP_API_BASE_URL': JSON.stringify(apiBaseUrl),
    },
  };
});
