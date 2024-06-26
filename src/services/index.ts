import { UserService } from './user.service';
import { TokenService } from './token.service';
import { FastifyInstance } from 'fastify';
import { AuthLocalService } from './auth/local.service';
import { AutoLoginService } from './autoLogin.service';

const services = (fastify: FastifyInstance) => {
  return {
    authLocalService: new AuthLocalService(fastify),
    tokenService: new TokenService(fastify),
    userService: new UserService(fastify),
    autoLoginService: new AutoLoginService(fastify),
  };
};

export default services;
