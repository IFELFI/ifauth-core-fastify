import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import services from "../services";

declare module 'fastify' {
  interface FastifyInstance {
    services: ReturnType<typeof services>;
  }
}

const loadServicesPlugin: FastifyPluginAsync = fp(async (fastify, opts) => {
  fastify.decorate('services', services(fastify));
})

export default loadServicesPlugin;