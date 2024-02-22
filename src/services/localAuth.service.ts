import { PrismaClient } from "@prisma/client";
import { FastifyRedis } from "@fastify/redis";
import { FastifyTypebox } from "..";
import { localLoginSchema, localSignupSchema } from "../schema/auth.schema";
import { Static } from "@sinclair/typebox";
import { requestError } from "../errors";

export class LocalAuthService {
  #prisma: PrismaClient;
  #redis: FastifyRedis;

  constructor(fastify: FastifyTypebox) {
    this.#prisma = fastify.prisma;
    this.#redis = fastify.redis;
  }

  public async signup(signupData: Static<typeof localSignupSchema.body>){
    return await this.#prisma.$transaction(async (tx) => {
      const searchUser = await tx.users.findUnique({ where: { email: signupData.email } });
      if (searchUser) throw requestError("Email already exists")
    })
  }

  public async login(loginData: Static<typeof localLoginSchema.body>){

  }
}