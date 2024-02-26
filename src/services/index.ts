import { UserService } from './user.service';
import { TokenService } from './token.service';
import { FastifyInstance } from "fastify";
import { LocalAuthService } from "./localAuth.service";

const services = (fastify: FastifyInstance) => {
  return {
    localAuthService: new LocalAuthService(fastify),
    tokenService: new TokenService(fastify),
    userService: new UserService(fastify)
  }
}

export default services;