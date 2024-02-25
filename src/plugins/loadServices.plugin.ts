import { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import services, { Services } from "../services";
import { serviceList } from "../services";

declare module 'fastify' {
  interface FastifyInstance {
    services: Services;
  }
}

const loadServicesPlugin: FastifyPluginAsync = fp(async (fastify, opts) => {
  fastify.decorate('services', services(fastify));
})

async function loadServices(fastify: FastifyInstance) {
  for (const service in serviceList) {
    serviceList[service]
  }
}

export default loadServicesPlugin;