import { FastifyInstance } from "fastify";
import { LocalAuthService } from "./localAuth.service";

const services = (fastify: FastifyInstance) => {
  return {
    localAuthService: new LocalAuthService(fastify)
  }
}

export default services;