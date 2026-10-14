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
      if (pathname === '/api/register' || pathname === '/api/register/eclash') {
        const { default: handler } = await import('./api/register/eclash.js');
        return handler(req, res);
      }
      if (pathname === '/api/volunteer/login') {
        const { default: handler } = await import('./api/volunteer/login.js');
        return handler(req, res);
      }
      if (pathname === '/api/volunteer/me') {
        const { default: handler } = await import('./api/volunteer/me.js');
        return handler(req, res);
      }
      if (pathname === '/api/volunteer/scan') {
        const { default: handler } = await import('./api/volunteer/scan.js');
        return handler(req, res);
      }
      if (pathname === '/api/volunteer/checkin') {
        const { default: handler } = await import('./api/volunteer/checkin.js');
        return handler(req, res);
      }
      if (pathname === '/api/volunteer/stats') {
        const { default: handler } = await import('./api/volunteer/stats.js');
        return handler(req, res);
      }
      if (pathname === '/api/volunteer/search') {
        const { default: handler } = await import('./api/volunteer/search.js');
        return handler(req, res);
      }
      if (pathname === '/api/volunteer/history') {
        const { default: handler } = await import('./api/volunteer/history.js');
        return handler(req, res);
      }
      if (pathname === '/api/admin/login') {
        const { default: handler } = await import('./api/admin/login.js');
        return handler(req, res);
      }
      if (pathname === '/api/admin/registrations') {
        const { default: handler } = await import('./api/admin/registrations.js');
        return handler(req, res);
      }
      if (pathname === '/api/admin/volunteers') {
        const { default: handler } = await import('./api/admin/volunteers.js');
        return handler(req, res);
      }
      if (pathname === '/api/health') {
        const { default: handler } = await import('./api/health.js');
        return handler(req, res);
      }

      // Dynamic fallback for any /api/volunteer/* or /api/* route
      const cleanSubpath = pathname.replace(/^\/api\//, '').replace(/\/$/, '');
      try {
        const dynamicModule = await import(`./api/${cleanSubpath}.js`);
        if (dynamicModule?.default) {
          return dynamicModule.default(req, res);
        }
      } catch (importErr) {
        // Module doesn't exist, proceed to 404
      }

      res.status(404).json({ error: `API route ${pathname} not found.` });
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
