import fastify, { FastifyInstance } from 'fastify';
import { registry } from './monitoring/metrics.ts';
import registerRoutes from './routes/index.ts';
import registerPlugins from './plugins/index.ts';

export async function build(): Promise<FastifyInstance> {
  const app: FastifyInstance = fastify({
    logger: true,
  });

  // Register plugins
  // await app.register(cors, {
  //   origin: true,
  //   credentials: true,
  // });

  // Register all plugins (security, websocket, etc.)
  await registerPlugins(app);

  // Register all routes (including /metrics)
  await registerRoutes(app);

  // Remove the global authentication hook. Authentication will be handled per-route in route plugins.
  // app.addHook('onRequest', async (request, reply) => {
  //   try {
  //     app.log.info({ method: request.method, url: request.url }, 'Auth hook check');
  //     const publicPaths = [
  //       '/health',
  //       '/metrics',
  //       '/metrics/json',
  //       '/ws',
  //       '/documentation',
  //     ];
  //     if (
  //       request.method && request.method.toUpperCase() === 'GET'
  //     ) {
  //       return;
  //     }
  //     if (request.url && publicPaths.some((path) => request.url.startsWith(path))) {
  //       return;
  //     }
  //     await request.jwtVerify();
  //   } catch (err) {
  //     reply.send(err);
  //   }
  // });

  app.addHook('onClose', async () => {
    registry.clear();
  });

  return app;
}
