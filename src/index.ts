import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import fastify, { ContextConfigDefault, FastifyBaseLogger, FastifyInstance, FastifyReply, FastifyRequest, FastifySchema, RawReplyDefaultExpression, RawRequestDefaultExpression, RawServerDefault, RouteGenericInterface } from "fastify";
import { registerRoutes } from "./routes";
// Import plugins
import env from "@fastify/env"
import prismaPlugin from "./plugins/prisma.plugin";
import redis from "@fastify/redis"
import sensible from "@fastify/sensible"
import loadServicesPlugin from "./plugins/loadServices.plugin";
// Import schema
import envSchema from "./schema/env.schema";

// Define types
export type FastifyTypebox = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  FastifyBaseLogger,
  TypeBoxTypeProvider
>;

export type FastifyRequestTypebox<TSchema extends FastifySchema> = FastifyRequest<
  RouteGenericInterface,
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  TSchema,
  TypeBoxTypeProvider
>;

export type FastifyReplyTypebox<TSchema extends FastifySchema> = FastifyReply<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  RouteGenericInterface,
  ContextConfigDefault,
  TSchema,
  TypeBoxTypeProvider
>


async function start() {
  try {
    // Create server
    const server = fastify({
      ajv: {
        customOptions: {
          removeAdditional: "all",
          useDefaults: true,
          coerceTypes: true,
          allErrors: true,
        }
      },
      logger: {
        level: "info",
        file: __dirname + "/../logs/logs.log",
        redact: ["req.headers.authorization"],
        serializers: {
          req(req) {
            return {
              method: req.method,
              url: req.url,
              headers: req.headers,
              body: req.body,
              remoteAddress: req.ip,
              hostname: req.hostname,
              remotePort: req.connection.remotePort,
            }
          }
        }
      }
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
    await server.register(sensible);
    await server.register(loadServicesPlugin);

    // Register routes
    registerRoutes(server);

    // Start server
    const port = server.config.PORT
    await server.listen({ port: port })
    console.log(`Server listening on port ${port}`)
  } catch (error) {
    throw error
  }
}

start()