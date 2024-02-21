import { PrismaClient } from "@prisma/client";
import { FastifyRedis } from "@fastify/redis";
import { FastifyTypebox } from "..";

export class LocalAuthService {
  #prisma: PrismaClient;
  #redis: FastifyRedis;

  constructor(fastify: FastifyTypebox) {
    this.#prisma = fastify.prisma;
    this.#redis = fastify.redis;
  }

  async signup(){
    
  }
}