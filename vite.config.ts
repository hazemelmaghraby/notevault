
import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'node:fs';

// Blink: guarantee global CSS survives agent rewrites of src/routes/__root.tsx.
function blinkEnsureRootCss() {
  return {
    name: 'blink-ensure-root-css',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      const file = id.split('?')[0];
      if (!file.endsWith('/src/routes/__root.tsx')) return null;

      if (/import\s+['"][^'"]*index\.css['"]/.test(code)) return null;

      const cssPath = path.resolve(path.dirname(file), '../index.css');
      if (!fs.existsSync(cssPath)) return null;

      return { code: `${code}\nimport '../index.css';\n`, map: null };
    },
  };
}

// Blink: report route-tree generation failures.
function blinkRouteTreeHealth() {
  const ROUTES_DIR = path.resolve(import.meta.dirname, './src/routes');
  const GEN_FILE = path.resolve(import.meta.dirname, './src/routeTree.gen.ts');
  const SETTLE_MS = 1200;
  const STARTUP_SETTLE_MS = 4000;

  function routeFiles(dir: string, base = ''): string[] {
    const out: string[] = [];

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('-')) continue;

      const rel = base ? `${base}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        out.push(...routeFiles(path.join(dir, entry.name), rel));
      } else if (
        /\.tsx?$/.test(entry.name) &&
        !entry.name.startsWith('__root.')
      ) {
        if (
          !/createFileRoute\s*\(/.test(
            fs.readFileSync(path.join(dir, entry.name), 'utf-8')
          )
        ) {
          continue;
        }

        out.push(
          rel.replace(/\.lazy\.tsx?$/, '').replace(/\.tsx?$/, '')
        );
      }
    }

    return out;
  }

  function missingFromTree(): string[] {
    if (!fs.existsSync(GEN_FILE) || !fs.existsSync(ROUTES_DIR)) {
      return [];
    }

    const gen = fs.readFileSync(GEN_FILE, 'utf-8');

    return [...new Set(routeFiles(ROUTES_DIR))].filter((id) => {
      const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      return !new RegExp(
        `\\./routes/${escaped}(\\.tsx?)?['"\`]`
      ).test(gen);
    });
  }

  return {
    name: 'blink-route-tree-health',
    apply: 'serve' as const,

    configureServer(server: import('vite').ViteDevServer) {
      let timer: NodeJS.Timeout | undefined;
      let pending: string | null = null;

      const report = (message: string) => {
        pending = message;

        try {
          server.ws.send({
            type: 'error',
            err: {
              message,
              stack: '',
              plugin: 'blink-route-tree-health',
              id: GEN_FILE,
            },
          });
        } catch {
          // Fail open.
        }
      };

      const check = () => {
        try {
          const missing = missingFromTree();

          if (missing.length === 0) {
            pending = null;
            return;
          }

          setTimeout(() => {
            try {
              const stillMissing = missingFromTree();

              if (stillMissing.length === 0) {
                pending = null;
                return;
              }

              const files = stillMissing
                .map((id) => `  src/routes/${id}.tsx`)
                .join('\n');

              const message =
                'Route generation FAILED — src/routeTree.gen.ts is stale, so these route ' +
                'files are NOT registered and the production build will fail:\n' +
                `${files}\n\n` +
                'The dev preview is still serving the last good route tree, so it looks fine — ' +
                'it is not. Run `bun run build` to see the generator error verbatim.\n\n' +
                'Most common cause: two files resolving to the SAME path. A `_`-prefixed ' +
                'layout is PATHLESS (no URL segment), so `src/routes/_x/index.tsx` — and a ' +
                'childless `src/routes/_x.tsx` — both resolve to "/" and collide with ' +
                'src/routes/index.tsx. Put dashboard pages under the real `/app` segment ' +
                '(src/routes/app/) instead. Also check every route file exports ' +
                '`const Route = createFileRoute(...)` — never `export default`.';

              report(message);
              server.config.logger.error(`[blink] ${message}`);
            } catch {
              // Fail open.
            }
          }, SETTLE_MS);
        } catch {
          // Fail open.
        }
      };

      server.watcher.on('all', (_event: string, file: string) => {
        if (!file.startsWith(ROUTES_DIR)) return;

        clearTimeout(timer);
        timer = setTimeout(check, SETTLE_MS);
      });

      const startupTimer = setTimeout(check, STARTUP_SETTLE_MS);

      try {
        server.ws.on('connection', () => {
          if (pending) report(pending);
        });
      } catch {
        // Fail open.
      }

      server.httpServer?.once('close', () => {
        clearTimeout(startupTimer);
        clearTimeout(timer);
      });
    },
  };
}

export default defineConfig({
  plugins: [
    blinkEnsureRootCss(),
    blinkRouteTreeHealth(),

    // Tailwind CSS v4.
    tailwindcss(),

    // Optional Blink build-time tagger disabled because its module is missing.

    // TanStack Start must come before the React plugin.
    tanstackStart({
      prerender: {
        enabled: true,
        crawlLinks: true,
        failOnError: false,
      },
    }),

    viteReact(),
  ],

  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'framer-motion',
      '@tanstack/react-router',
      '@tanstack/react-query',
    ],
  },

  server: {
    port: 3000,
    strictPort: true,
    host: true,
    allowedHosts: true,
  },

  build: {
    outDir: '.vite-out',
    emptyOutDir: true,
  },
});
