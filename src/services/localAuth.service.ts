import { PrismaClient, provider_type, users } from "@prisma/client";
import { FastifyRedis } from "@fastify/redis";
import { FastifyTypebox } from "..";
import { localLoginSchema, localSignupSchema } from "../schema/auth.schema";
import { Static } from "@sinclair/typebox";
import { HttpErrors } from "@fastify/sensible";
import { FastifyService } from ".";

export class LocalAuthService extends FastifyService {
  #prisma: PrismaClient;
  #redis: FastifyRedis;
  #httpErrors: HttpErrors;

  constructor(fastify: FastifyTypebox) {
    super(fastify);
    this.#prisma = fastify.prisma;
    this.#redis = fastify.redis;
    this.#httpErrors = fastify.httpErrors;
  }

  public async signup(signupData: Static<typeof localSignupSchema.body>): Promise<users>{
    return await this.#prisma.$transaction(async (tx) => {
      const searchUser = await tx.users.findUnique({ where: { email: signupData.email } });
      if (searchUser) {
        throw this.#httpErrors.conflict("Email already exists");
      }
      try {
        const createUser = await tx.users.create({ data: { email: signupData.email }});
        await tx.password.create({ data: { users: { connect: { id: createUser.id }}, password: signupData.password}})
        await tx.provider.create({ data: { users: { connect: { id: createUser.id }}, provider: provider_type.local}});
        return createUser;
      } catch (error) {
        throw this.#httpErrors.internalServerError("Error creating user");
      }
    })
  }

  public async login(loginData: Static<typeof localLoginSchema.body>){

  }
}