import { FastifyCookieOptions } from '@fastify/cookie';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import fastify, {
  ContextConfigDefault,
  FastifyBaseLogger,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  FastifySchema,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
  RouteGenericInterface,
} from 'fastify';
import { registerRoutes } from './routes';
// Import plugins
import env from '@fastify/env';
import prismaPlugin from './plugins/prisma.plugin';
import redis from '@fastify/redis';
import sensible from '@fastify/sensible';
import loadServicesPlugin from './plugins/loadServices.plugin';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import jwt from './plugins/jwt.plugin'
import underPressure from '@fastify/under-pressure';
// Import schema
import envSchema from './schema/env.schema';
import typiaPlugin from './plugins/typia.plugin';

// Define types
export type FastifyTypebox = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  FastifyBaseLogger,
  TypeBoxTypeProvider
>;

export type FastifyRequestTypebox<TSchema extends FastifySchema> =
  FastifyRequest<
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
>;

async function build(opts: {}, data: any = process.env) {
  const app = fastify(opts).withTypeProvider<TypeBoxTypeProvider>();
  await app.register(env, {
    confKey: 'config',
    schema: envSchema,
    data: data,
  });
  await app.register(prismaPlugin, {
    datasourceUrl: app.config.DATABASE_URL,
  });
  await app.register(redis, {
    url: app.config.REDIS_URL,
  });
  await app.register(sensible);
  await app.register(loadServicesPlugin);
  await app.register(typiaPlugin);
  await app.register(cookie, {
    secret: app.config.COOKIE_SECRET,
    parseOptions: {
      domain: '.ifelfi.com',
      sameSite: 'lax',
      path: '/',
      secure: true,
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7,
      expires: new Date(Date.now() + 60 * 60 * 24 * 7),
      signed: true,
    },
  } as FastifyCookieOptions);
  await app.register(jwt, {
    secret: app.config.TOKEN_SECRET,
    sign: {
      issuer: app.config.ISSUER,
    },
    verify: {
      issuer: app.config.ISSUER,
    },
    decode: {
      complete: false,
    },
  });
  await app.register(helmet, { global: true });
  await app.register(cors, {
    origin: ['http://localhost:5173', 'https://ifelfi.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Set-Cookie', 'Cookie'],
    exposedHeaders: ['Authorization'],
  });

  // Register routes
  registerRoutes(app);

  return app;
}

export default build;
