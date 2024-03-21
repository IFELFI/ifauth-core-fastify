import { FastifyCookieOptions } from '@fastify/cookie';
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import fastify, { ContextConfigDefault, FastifyBaseLogger, FastifyInstance, FastifyReply, FastifyRequest, FastifySchema, RawReplyDefaultExpression, RawRequestDefaultExpression, RawServerDefault, RouteGenericInterface } from "fastify";
import { registerRoutes } from "./routes";
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

async function build(opts: {}, data: any = process.env) {
  const app = fastify(opts).withTypeProvider<TypeBoxTypeProvider>();
  await app.register(env, {
    confKey: "config",
    schema: envSchema,
    data: data
  });
  await app.register(prismaPlugin, {
    datasourceUrl: app.config.DATABASE_URL,
  });
  await app.register(redis, {
    url: app.config.REDIS_URL,
  })
  await app.register(sensible);
  await app.register(loadServicesPlugin);
  await app.register(cookie, {
    secret: app.config.COOKIE_SECRET,
    parseOptions: {
      samesite: "none",
      path: "/",
      secure: true,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
      signed: true,
    },
  } as FastifyCookieOptions);
  await app.register(jwt, {
    secret: app.config.TOKEN_SECRET,
    sign: {
      iss: "ifelfi.com",
    },
    verify: {
      allowedIss: "ifelfi.com",
    }
  });
  await app.register(helmet, { global: true });
  await app.register(cors, { origin: ['http://localhost:5173'], credentials: true, methods: ["GET", "POST", "PUT", "DELETE"], allowedHeaders: ["Content-Type", "Authorization"] });
  await app.register(underPressure, {
    maxEventLoopDelay: 1000,
    retryAfter: 50,
    maxHeapUsedBytes: 100000000,
    maxRssBytes: 100000000,
    maxEventLoopUtilization: 0.98,
    message: "Server under heavy load, please try again later."
  });

  // Register routes
  registerRoutes(app);

  return app;
}

export default build;
