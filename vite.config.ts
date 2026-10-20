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
          if (!/\/experiment\/(main|settings)\.js$/.test(id.replaceAll('\\', '/'))) return;
          const result = await transformAsync(source, { filename: id, babelrc: false, configFile: false,
            plugins: [[solid, { generate: 'dom' }]], sourceMaps: true });
          return { code: result!.code!, map: result!.map };
        },
        generateBundle(_options, bundle) {
          const chunks = Object.values(bundle).filter(item => item.type === 'chunk');
          const entry = chunks.find(chunk => Object.keys(chunk.modules).some(id => id.replaceAll('\\', '/').endsWith('/experiment/main.js')));
          if (!entry) this.error('Solid entry is missing from the build');
          const pending = [entry.fileName], visited = new Set<string>();
          let solidRuntime = false, solidMenus = false;
          while (pending.length) {
            const file = pending.pop()!;
            if (visited.has(file)) continue;
            visited.add(file);
            const chunk = bundle[file];
            if (!chunk || chunk.type !== 'chunk') continue;
            for (const source of Object.keys(chunk.modules)) {
              const id = source.replaceAll('\\', '/');
              if (/\/node_modules\/(react|react-dom)\//.test(id) || /\/adapters\/react(?:-ui)?\.js$/.test(id)) this.error('React leaked into the Solid page: ' + id);
              if (/\/node_modules\/(solid-js|@solidjs)\//.test(id)) solidRuntime = true;
              if (id.endsWith('/experiment/settings.js')) solidMenus = true;
            }
            pending.push(...chunk.imports, ...chunk.dynamicImports);
          }
          if (!solidRuntime || !solidMenus) this.error('Solid runtime and Solid menu components are required');
          this.emitFile({type: 'asset', fileName: 'solid-runtime.json', source: JSON.stringify({framework: 'solid-2-rc', menus: 'solid', react: false}, null, 2)});
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
