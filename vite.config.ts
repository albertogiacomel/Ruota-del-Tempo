import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { transformAsync } from '@babel/core'
import solid from '@solidjs/babel-plugin'
import { resolve } from 'node:path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [
      {
        name: 'solid-experiment', enforce: 'pre',
        async transform(source, id) {
          if (!id.replaceAll('\\', '/').endsWith('/experiment/main.js')) return;
          const result = await transformAsync(source, { filename: id, babelrc: false, configFile: false,
            plugins: [[solid, { generate: 'dom' }]], sourceMaps: true });
          return { code: result!.code!, map: result!.map };
        },
      },
      react({ exclude: /experiment\// }),
    ],
    build: { rollupOptions: {
      input: { classic: resolve(import.meta.dirname, 'index.html'), experiment: resolve(import.meta.dirname, 'solid-three.html') },
      output: { manualChunks(id) { if (id.replaceAll('\\', '/').endsWith('/three/build/three.core.js')) return 'three-core'; } },
    } },
    optimizeDeps: { esbuildOptions: { loader: { '.js': 'jsx' } } },
    server: { watch: { ignored: ['**/artifacts/**'] } },
    define: {
      // Shims process.env.API_KEY for use in the browser logic
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
  }
})
