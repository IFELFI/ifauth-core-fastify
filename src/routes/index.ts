import { FastifyTypebox } from "..";
import authLocal from "./localAuth.route";
import tokenRoute from "./token.route";
import userRoute from "./user.route";

export function registerRoutes(fastify: FastifyTypebox) {

  fastify.get(fastify.config.API_URI + '/health', async (request, reply) => {
    return { status: 'ok' }
  });

  authLocal(fastify);
  tokenRoute(fastify);
  userRoute(fastify);
}
