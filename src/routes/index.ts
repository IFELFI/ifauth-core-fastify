import { FastifyTypebox } from "..";
import authLocal from "./localAuth.route";

export function registerRoutes(fastify: FastifyTypebox) {

  fastify.get('/health', async (request, reply) => {
    return { status: 'ok' }
  });

  authLocal(fastify);
}