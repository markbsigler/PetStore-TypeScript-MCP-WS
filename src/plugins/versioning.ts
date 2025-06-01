import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

export interface VersioningOptions {
  defaultVersion?: string;
  supportedVersions?: string[];
}

const versioningPlugin: FastifyPluginAsync<VersioningOptions> = async (fastify, options) => {
  const defaultVersion = options.defaultVersion || '1';
  const supportedVersions = options.supportedVersions || ['1'];

  // Add version information to every route
  fastify.addHook('onRoute', routeOptions => {
    // const version = routeOptions.version || defaultVersion;
    const version = defaultVersion;
    if (!supportedVersions.includes(version)) {
      throw new Error(`API version ${version} is not supported`);
    }
    routeOptions.url = `/v${version}${routeOptions.url}`;
  });

  // Add version validation hook
  fastify.addHook('onRequest', async (request, reply) => {
    const version = request.url.split('/')[1];
    if (!version.startsWith('v')) {
      return reply.redirect(`/v${defaultVersion}${request.url}`);
    }
    const versionNum = version.substring(1);
    if (!supportedVersions.includes(versionNum)) {
      return reply.status(400).send({
        error: 'Unsupported API version',
        supportedVersions,
      });
    }
  });
};

export default fp(versioningPlugin, {
  name: 'versioning',
});
