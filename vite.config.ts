import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const define = {
    'process.env.APP_GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID ?? ''),
    'process.env.APP_GOOGLE_CLIENT_SECRET': JSON.stringify(env.GOOGLE_CLIENT_SECRET ?? ''),
  }

  return {
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    plugins: [
      react(),
      electron({
        main: {
          entry: 'electron/main.ts',
          vite: {
            define,
            build: {
              outDir: 'dist-electron',
              rollupOptions: { external: ['electron'] },
            },
          },
        },
        preload: {
          input: path.join(__dirname, 'electron/preload.ts'),
          vite: {
            build: {
              outDir: 'dist-electron',
              rollupOptions: { external: ['electron'] },
            },
          },
        },
      }),
    ],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 1500,
    },
    server: { port: 5273, strictPort: true },
  }
})
