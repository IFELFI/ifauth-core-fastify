import { FastifyPluginAsync, FastifyPluginCallback } from 'fastify';
import fp from 'fastify-plugin';
import typia from 'typia';

declare module 'fastify' {
  interface FastifyInstance {
    typia: typeof typia;
  }
}

const typiaPlugin: FastifyPluginAsync = fp(async (fastify, opts) => {
  fastify.decorate('typia', typia);
});

export default typiaPlugin;