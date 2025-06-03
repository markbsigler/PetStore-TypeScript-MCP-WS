// Register TypeScript loader
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Register ts-node/esm loader
await register('ts-node/esm', pathToFileURL('./'));

// Import the main application
import('./src/index.ts').catch(console.error);
