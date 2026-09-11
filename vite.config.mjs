import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['REACT_APP_', 'PORT']);

  return {
    plugins: [react()],
    base: '/test_delhivery/',
    define: {
      'process.env.REACT_APP_API_BASE_URL': JSON.stringify(
        env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api'
      ),
    },
    server: { port: Number(env.PORT) || 3001, strictPort: true },
    build: { outDir: 'build' },
  };
});
