import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import fastify, { FastifyBaseLogger, FastifyInstance, RawReplyDefaultExpression, RawRequestDefaultExpression, RawServerDefault } from "fastify";
import { registerRoutes } from "./routes";
// Import plugins
import env from "@fastify/env"
import prismaPlugin from "./plugins/prisma.plugin";
import redis from "@fastify/redis"
// Import schema
import envSchema from "./schema/env.schema";

export type FastifyTypebox = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  FastifyBaseLogger,
  TypeBoxTypeProvider
>;

async function start() {
  try {
    const server = fastify({
      ajv: {
        customOptions: {
          removeAdditional: "all",
          useDefaults: true,
          coerceTypes: true,
          allErrors: true,
        }
      },
      logger: true
    })
      .withTypeProvider<TypeBoxTypeProvider>();

    // Load environment variables
    await server.register(env, {
      confKey: "config",
      schema: envSchema,
    });
    const { config } = server;

    // Register plugins
    await server.register(prismaPlugin);
    await server.register(redis, {
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
    })

    registerRoutes(server);

    const port = server.config.PORT
    await server.listen({ port: port })
  } catch (error) {
    throw error
  }
}

start()