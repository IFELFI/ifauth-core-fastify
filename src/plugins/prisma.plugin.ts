import { PrismaClient } from '@prisma/client';
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

const prismaPlugin: FastifyPluginAsync = fp(async (server, opts) => {
  const prisma = new PrismaClient();

  await prisma.$connect();

  server.decorate('prisma', prisma);

  server.addHook('onClose', async (server) => {
    server.prisma.$disconnect();
  })
})

export default prismaPlugin;