import { FastifyTypebox } from '../app';
import authLocalRoute from './auth/local.route';
import oauthRoute from './oauth.route';
import tokenRoute from './token.route';
import userRoute from './user.route';

export function registerRoutes(fastify: FastifyTypebox) {
  fastify.get('/health', async (request, reply) => {
    return { status: 'ok' };
  });

  authLocalRoute(fastify);
  tokenRoute(fastify);
  userRoute(fastify);
  oauthRoute(fastify);
}
