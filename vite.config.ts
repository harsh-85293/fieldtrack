import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    {
      name: 'vera-api-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = req.url ?? '';
          // Match /v1/* or /api/v1/* — handle before the /api proxy
          const isVera = /^\/(api\/)?v1\//.test(url);
          if (!isVera) return next();

          try {
            const protocol = 'http';
            const host = req.headers.host || 'localhost';
            const fullUrl = `${protocol}://${host}${url}`;
            const headers = new Headers();
            for (const [k, v] of Object.entries(req.headers)) {
              if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
              else if (v) headers.set(k, String(v));
            }
            const method = req.method || 'GET';
            let body: ReadableStream<Uint8Array> | undefined;
            if (method !== 'GET' && method !== 'HEAD') {
              body = new ReadableStream({
                start(controller) {
                  req.on('data', (chunk) => controller.enqueue(new Uint8Array(chunk)));
                  req.on('end', () => controller.close());
                  req.on('error', (e) => controller.error(e));
                },
              });
            }
            const request = new Request(fullUrl, { method, headers, body });

            const { handleVeraApiNode } = await import('./src/vera/node-api.ts');
            const response = await handleVeraApiNode(request, url);

            if (!response) return next();

            res.statusCode = response.status;
            response.headers.forEach((v, k) => res.setHeader(k, v));
            const text = await response.text();
            res.end(text);
          } catch (err) {
            console.error('[vera-api]', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Internal server error', detail: String(err) }));
          }
        });
      },
    },
    react(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        // Don't proxy /api/v1/* — that's handled by Vera middleware above
        bypass: (req) => {
          if (req.url && /^\/api\/v1\//.test(req.url)) return req.url;
        },
      },
    },
  },
});
