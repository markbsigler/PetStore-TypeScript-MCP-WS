import { FastifyInstance } from 'fastify';
import { build } from './app.js';

// Track if server is already running
let server: { app: FastifyInstance; server: string } | null = null;

async function startServer(port = 3000, host = '0.0.0.0'): Promise<{ app: FastifyInstance; server: string }> {
  // If server is already running, return the existing instance
  if (server) {
    console.log('Server is already running');
    return server;
  }

  try {
    console.log('Starting server...');
    
    // Build the Fastify app with all plugins and routes
    console.log('Building application...');
    const app = await build();
    
    // Handle graceful shutdown
    const shutdown = async () => {
      console.log('\nShutting down server gracefully...');
      try {
        await app.close();
        console.log('Server has been shut down');
        process.exit(0);
      } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
      }
    };
    
    // Set up signal handlers
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
    // Start the server
    console.log('\nStarting to listen on port', port);
    const serverAddress = await app.listen({ 
      port, 
      host,
      listenTextResolver: (address) => {
        console.log(`Server is running at ${address}`);
        return address;
      }
    });
    
    // Store server instance
    const serverInfo = { app, server: serverAddress };
    server = serverInfo;
    
    return serverInfo;
    
  } catch (error) {
    console.error('\n!!! Error starting server !!!');
    console.error(error);
    throw error;
  }
}

// Only start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch(err => {
    console.error('Fatal error during server startup:', err);
    process.exit(1);
  });
}

// Export the server instance and builder
export { build, startServer };
export type { FastifyInstance };
