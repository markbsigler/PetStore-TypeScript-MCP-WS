import { build } from './app.ts';

build().then(app => {
  app.listen({ port: 3000, host: '0.0.0.0' }).catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start app:', err);
    process.exit(1);
  });
}).catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start app:', err);
  process.exit(1);
});

export { build };
