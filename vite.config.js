import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Middleware to serve /api serverless functions directly in Vite dev and preview servers
function serverlessApiPlugin() {
  const handleApiRequest = async (req, res, next) => {
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname.replace(/\/$/, '');

    if (!pathname.startsWith('/api')) {
      return next();
    }

    // Helper wrappers to match Vercel Serverless Function signature
    res.status = (statusCode) => {
      res.statusCode = statusCode;
      return res;
    };
    res.json = (payload) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(payload));
    };

    // Parse JSON body for POST/PUT/DELETE requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const rawBody = Buffer.concat(chunks).toString('utf-8');
      try {
        req.body = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        req.body = {};
      }
    } else {
      req.body = {};
    }

    // Parse query params
    req.query = Object.fromEntries(url.searchParams.entries());

    try {
      const { default: handler } = await import('./api/[...path].js');
      return handler(req, res);
    } catch (err) {
      console.error('[API Middleware Error]:', err);
      res.status(500).json({ error: 'Internal API Server Error', details: err.message });
    }
  };

  return {
    name: 'serverless-api-plugin',
    configureServer(server) {
      server.middlewares.use(handleApiRequest);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleApiRequest);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), serverlessApiPlugin()],
  server: {
    fs: {
      strict: false,
    },
  },
});
