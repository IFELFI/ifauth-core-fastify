import { FastifyRedis } from "@fastify/redis";
import { PrismaClient } from "@prisma/client";
import { FastifyTypebox } from "..";
import { LocalAuthService } from "../services/localAuth.service";
import { FastifyReply, FastifyRequest } from "fastify";

export class LocalAuthController {
  #localAuthService: LocalAuthService;

  constructor(fastify: FastifyTypebox) {
    this.#localAuthService = new LocalAuthService(fastify);
  }

  async signup(request: FastifyRequest, reply: FastifyReply) {
    return this.#localAuthService.signup();
  }
}