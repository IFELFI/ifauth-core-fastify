import { FastifyCookieOptions } from './../node_modules/@fastify/cookie/types/plugin.d';
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import fastify, { ContextConfigDefault, FastifyBaseLogger, FastifyInstance, FastifyReply, FastifyRequest, FastifySchema, RawReplyDefaultExpression, RawRequestDefaultExpression, RawServerDefault, RouteGenericInterface } from "fastify";
import { registerRoutes } from "./routes";
import fs from "fs";
// Import plugins
import env from "@fastify/env"
import prismaPlugin from "./plugins/prisma.plugin";
import redis from "@fastify/redis"
import sensible from "@fastify/sensible"
import loadServicesPlugin from "./plugins/loadServices.plugin";
import jwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet"
import cors from "@fastify/cors"
import underPressure from "@fastify/under-pressure"
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


// Create server
async function start() {
  try {
    fs.mkdirSync(__dirname + "/../logs", { recursive: true });
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
    await server.register(cookie, {
      secret: config.COOKIE_SECRET,
      parseOptions: {
        samesite: "none",
        path: "/",
        secure: true,
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        signed: true,
      },
    } as FastifyCookieOptions);
    await server.register(jwt, {
      secret: config.TOKEN_SECRET,
      sign: {
        iss: "ifelfi.com",
      },
      verify: {
        allowedIss: "ifelfi.com",
      }
    });
    await server.register(helmet, { global: true });
    await server.register(cors, { origin: ['http://localhost:5173'], credentials: true, methods: ["GET", "POST", "PUT", "DELETE"], allowedHeaders: ["Content-Type", "Authorization"] })
    await server.register(underPressure, {
      maxEventLoopDelay: 1000,
      retryAfter: 50,
      maxHeapUsedBytes: 100000000,
      maxRssBytes: 100000000,
      maxEventLoopUtilization: 0.98
    });


    // Register routes
    registerRoutes(server);

    // Start server
    const host = server.config.HOST;
    const port = server.config.PORT;
    await server.listen({ host: host, port: port })
    console.log(`Server listening on port ${port}`)
  } catch (error) {
    throw error
  }
}

start();