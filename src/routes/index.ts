import { FastifyTypebox } from '../app';
import authLocal from './auth/local';
import tokenRoute from './token.route';
import userRoute from './user.route';

export function registerRoutes(fastify: FastifyTypebox) {
  fastify.get('/health', async (request, reply) => {
    return { status: 'ok' };
  });

  authLocal(fastify);
  tokenRoute(fastify);
  userRoute(fastify);
}
