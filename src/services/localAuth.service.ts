import { provider_type, users } from "@prisma/client";
import { FastifyTypebox } from "..";
import { localLoginSchema, localSignupSchema } from "../schema/auth.schema";
import { Static } from "@sinclair/typebox";
import { AccessTokenPayload, TokenPair } from "../interfaces/token.interface";

export class LocalAuthService {
  #fastify: FastifyTypebox;

  constructor(fastify: FastifyTypebox) {
    this.#fastify = fastify;
  }

  public async signup(signupData: Static<typeof localSignupSchema.body>): Promise<TokenPair> {
    return await this.#fastify.prisma.$transaction(async (tx) => {
      const searchUser = await tx.users.findUnique({ where: { email: signupData.email } });
      if (searchUser) {
        throw this.#fastify.httpErrors.conflict("Email already exists");
      }
      try {
        const savedNickname = signupData.nickname || signupData.email.split('@')[0];
        const createUser = await tx.users.create({ data: { email: signupData.email }});
        await tx.profile.create({ data: { users: { connect: { id: createUser.id }}, nickname: savedNickname, image_url: signupData.imageUrl || null }});
        await tx.password.create({ data: { users: { connect: { id: createUser.id } }, password: signupData.password } })
        await tx.provider.create({ data: { users: { connect: { id: createUser.id } }, provider: provider_type.local } });

        const AccessTokenPayload: AccessTokenPayload = {
          uuidKey: createUser.uuid_key,
          email: createUser.email,
          nickname: savedNickname,
          imageUrl: signupData.imageUrl || null,
        }

        const accessToken = this.#fastify.jwt.sign(AccessTokenPayload, { expiresIn: this.#fastify.config.ACCESS_TOKEN_EXPIRATION })
        const refreshToken = this.#fastify.jwt.sign({}, { expiresIn: this.#fastify.config.REFRESH_TOKEN_EXPIRATION })

        return { accessToken, refreshToken };

      } catch (error) {
        throw this.#fastify.httpErrors.internalServerError("Error creating user");
      }
    })
  }

  public async login(loginData: Static<typeof localLoginSchema.body>){

  }
}