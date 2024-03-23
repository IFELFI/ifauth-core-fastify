import { UserService } from './user.service';
import { TokenService } from './token.service';
import { FastifyInstance } from 'fastify';
import { AuthLocalService } from './auth/local';

const services = (fastify: FastifyInstance) => {
  return {
    authLocalService: new AuthLocalService(fastify),
    tokenService: new TokenService(fastify),
    userService: new UserService(fastify),
  };
};

export default services;
