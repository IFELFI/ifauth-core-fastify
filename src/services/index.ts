import { UserService } from './user.service';
import { FastifyInstance } from "fastify";
import { LocalAuthService } from "./localAuth.service";

export class FastifyService {
  #fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.#fastify = fastify;
  }
}

export interface Services {
  localAuthService: LocalAuthService;
}

const services = (fastify: FastifyInstance): Services => {
  return {
    localAuthService: new LocalAuthService(fastify)
  }
}
type T = ReturnType<typeof services2>;

const services2 = (fastify: FastifyInstance) => {
  return {
    localAuthService: new LocalAuthService(fastify)
  }
}

export const serviceList = {
  LocalAuthService,
  UserService
};

export default services;