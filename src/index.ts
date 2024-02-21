import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import fastify, { FastifyBaseLogger, FastifyInstance, RawReplyDefaultExpression, RawRequestDefaultExpression, RawServerDefault } from "fastify";
// Import plugins
import env from "@fastify/env"
// Import schema
import envSchema from "./schema/env.schema";
import { registerRoutes } from "./routes";

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

    await server.register(env, {
      confKey: "config",
      schema: envSchema,
    })

    registerRoutes(server);

    const port = server.config.PORT
    await server.listen({ port: port })
  } catch (error) {
    throw error
  }
}

start()