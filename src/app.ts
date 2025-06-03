import fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import { registry } from './monitoring/metrics.js';
import registerPlugins from './plugins/index.js';

// Interface for route information
interface RouteInfo {
  method: string | string[];
  url: string;
  path: string;
  prefix: string;
  routePath: string;
  routeOptions: Record<string, unknown>;
}

// Type guard for RouteInfo
function isRouteInfo(obj: unknown): obj is RouteInfo {
  if (!obj || typeof obj !== 'object') return false;
  const route = obj as Record<string, unknown>;
  return (
    (Array.isArray(route.method) || typeof route.method === 'string') &&
    typeof route.url === 'string' &&
    typeof route.path === 'string' &&
    typeof route.prefix === 'string' &&
    typeof route.routePath === 'string' &&
    route.routeOptions !== null &&
    typeof route.routeOptions === 'object'
  );
}

// Helper to log routes
function logRoutes(app: FastifyInstance) {
  const routes = (app as { routes?: RouteInfo[] }).routes || [];
  
  if (routes.length === 0) {
    app.log.warn('No routes registered yet');
    return;
  }
  
  app.log.info('=== Registered Routes ===');
  routes.forEach((route: unknown) => {
    if (isRouteInfo(route)) {
      const methods = Array.isArray(route.method) ? route.method.join(',') : route.method;
      const prefix = route.prefix || '';
      const fullPath = `${prefix}${route.url}`.replace(/\/\//g, '/');
      app.log.info(`${String(methods).padEnd(6)} ${fullPath}`);
    } else if (route && typeof route === 'object' && 'method' in route && 'url' in route) {
      const r = route as { method: string | string[]; url: string };
      const methods = Array.isArray(r.method) ? r.method.join(',') : r.method;
      app.log.info(`${String(methods).padEnd(6)} ${r.url}`);
    }
  });
  app.log.info('=========================');
}

// Import route plugins
import healthPlugin from './routes/health.ts';
import metricsPlugin from './routes/metrics.ts';
import petRoutes from './routes/pet.routes.ts';
import userRoutes from './routes/user.routes.ts';
import storeRoutes from './routes/store.routes.ts';
import rootPlugin from './routes/root.ts';

export async function build(opts: FastifyServerOptions = {}): Promise<FastifyInstance> {
  // Create Fastify instance with provided options and default logger
  const app: FastifyInstance = fastify({
    ...opts,
    logger: opts.logger ?? true,
    pluginTimeout: 30 * 1000, // 30 seconds
  });

  // Error handling middleware
  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);
    reply.status(error.statusCode || 500).send({
      error: error.message || 'Internal Server Error',
      statusCode: error.statusCode || 500,
    });
  });

  try {
    console.log('=== Starting application setup ===');
    
    // Register plugins first
    console.log('\n=== Registering plugins ===');
    await registerPlugins(app);
    console.log('✓ All plugins registered successfully');
    
    // Register routes after plugins
    console.log('\n=== Registering routes ===');
    
    // Register all routes in a single plugin to ensure they're registered together
    await app.register(async (fastify) => {
      // Debug route - register it first
      fastify.get('/debug/routes', async (_request, _reply) => {
        const routes = (fastify.routes || []).map(route => ({
          method: route.method,
          url: route.url,
          path: route.path,
          prefix: route.prefix,
          routePath: route.routePath,
          routeOptions: route.routeOptions || {}
        }));
        return { routes };
      });

      // Health and metrics endpoints (no prefix)
      console.log('\n=== Registering health and metrics endpoints ===');
      await fastify.register(healthPlugin);
      await fastify.register(metricsPlugin);
      
      // API routes with /api/v1 prefix
      console.log('\n=== Registering API routes with /api/v1 prefix ===');
      await fastify.register(petRoutes, { prefix: '/api/v1' });
      await fastify.register(userRoutes, { prefix: '/api/v1' });
      await fastify.register(storeRoutes, { prefix: '/api/v1' });
      
      // Root endpoint (no prefix)
      console.log('\n=== Registering root endpoint ===');
      await fastify.register(rootPlugin);
      
      // Log all registered routes when app is ready
      fastify.ready(() => {
        console.log('\n=== Application setup complete ===\n');
        logRoutes(fastify);
      });
    }, { prefix: '' });
    
  } catch (error) {
    console.error('\n!!! Error during application startup !!!');
    console.error(error);
    
    // Ensure we close the app if there's an error during startup
    try {
      await app.close();
    } catch (closeError) {
      console.error('Error while closing app after startup error:', closeError);
    }
    
    throw error; // Re-throw to be handled by the caller
  }

  // Cleanup on close
  app.addHook('onClose', async () => {
    try {
      registry.clear();
      app.log.info('Application shutdown complete');
    } catch (err) {
      app.log.error('Error during cleanup:', err);
    }
  });

  return app;
}
