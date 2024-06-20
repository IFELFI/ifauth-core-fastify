import { FastifyTypebox } from '../app';
import authLocalRoute from './auth/local.route';
import tokenRoute from './token.route';
import userRoute from './user.route';
import authAutoRoute from './auth/auto.route';

export function registerRoutes(fastify: FastifyTypebox) {
  fastify.get('/health', async (request, reply) => {
    return { status: 'ok' };
  });

  authLocalRoute(fastify);
  authAutoRoute(fastify);
  tokenRoute(fastify);
  userRoute(fastify);
}
