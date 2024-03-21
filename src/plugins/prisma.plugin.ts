import { Prisma, PrismaClient } from '@prisma/client';
import { FastifyPluginCallback } from 'fastify';
import fp from 'fastify-plugin';

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}
export type FastifyPrismaClientOptions = Prisma.Subset<Prisma.PrismaClientOptions, Prisma.PrismaClientOptions>;
export type FastifyPrisma = FastifyPluginCallback<FastifyPrismaClientOptions>;

const fastifyPrisma: FastifyPrisma = async (fastify, opts, done) => {
  const prisma = new PrismaClient(opts);

  await prisma.$connect();

  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async (fastify) => {
    await fastify.prisma.$disconnect();
  })
  done();
}

const fastifyPrismaPlugin = fp(fastifyPrisma, {
  fastify: '4.x',
  name: 'fastify-prisma',
})

export default fastifyPrismaPlugin;