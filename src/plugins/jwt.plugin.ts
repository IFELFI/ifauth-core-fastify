import fp from 'fastify-plugin';
import { FastifyPluginCallback } from "fastify"
import jwt from "jsonwebtoken"

declare module 'fastify' {
  interface FastifyInstance {
    jwt: {
      sign: (
        payload: string | Buffer | object,
        options?: jwt.SignOptions,
      ) => string;
      verify: <T>(token: string, options?: jwt.VerifyOptions) => T;
      decode: <T = ReturnType<typeof jwt.decode>>(
        token: string,
        options?: jwt.DecodeOptions,
      ) => T | null;
    };
  }
}

export interface FastifyJwtOptions {
  secret: jwt.Secret,
  sign?: jwt.SignOptions,
  verify?: jwt.VerifyOptions,
  decode?: jwt.DecodeOptions,
}

const fastifyJwt: FastifyPluginCallback<FastifyJwtOptions> = async (
  fastify,
  opts,
) => {
  const methods = {
    sign: (payload: string | Buffer | object, options?: jwt.SignOptions) => {
      return jwt.sign(payload, opts.secret, {
        ...opts.sign,
        ...options,
      });
    },
    verify: <T = ReturnType<typeof jwt.verify>>(token: string, options?: jwt.VerifyOptions) => {
      const result = jwt.verify(token, opts.secret, {
        ...opts.verify,
        ...options,
      });
      return result as T;
    },
    decode: <T = ReturnType<typeof jwt.decode>>(token: string, options?: jwt.DecodeOptions) => {
      const result = jwt.decode(token, {
        ...opts.decode,
        ...options,
      });
      return result as T | null;
    },
  };
  fastify.decorate('jwt', methods);
  return methods;
};

const fastifyJwtPlugin = fp(fastifyJwt, {
  fastify: '4.x',
  name: 'fastify-jwt',
});

export default fastifyJwtPlugin;