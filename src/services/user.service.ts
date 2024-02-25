import { FastifyInstance } from "fastify";
import { FastifyService } from ".";

export class UserService extends FastifyService {

  constructor(fastify: FastifyInstance) {
    super(fastify);
  }

}