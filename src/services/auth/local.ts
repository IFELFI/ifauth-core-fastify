import { provider_type, users } from '@prisma/client';
import { FastifyTypebox } from '../../app';
import { localLoginSchema, localSignupSchema } from '../../schema/auth.schema';
import { Static } from '@sinclair/typebox';
import {
  AccessTokenPayload,
  TokenPair,
} from '../../interfaces/token.interface';
import bcrypt from 'bcrypt';

export class AuthLocalService {
  #fastify: FastifyTypebox;

  constructor(fastify: FastifyTypebox) {
    this.#fastify = fastify;
  }

  /**
   * Signup
   * @param signupData Signup data
   * @returns Token pair with access and refresh tokens
   */
  public async signup(
    signupData: Static<typeof localSignupSchema.body>,
  ): Promise<TokenPair> {
    return await this.#fastify.prisma.$transaction(async (tx) => {
      const searchUser = await tx.users.findUnique({
        where: { email: signupData.email },
      });
      if (searchUser) {
        throw this.#fastify.httpErrors.conflict('Email already exists');
      }
      try {
        const nickname = signupData.nickname || signupData.email.split('@')[0];
        const hashedPassword = await bcrypt.hash(signupData.password, 10);
        const createUser = await tx.users.create({
          data: { email: signupData.email },
        });
        await tx.profile.create({
          data: {
            users: { connect: { id: createUser.id } },
            nickname: nickname,
            image_url: signupData.imageUrl || null,
          },
        });
        await tx.password.create({
          data: {
            users: { connect: { id: createUser.id } },
            password: hashedPassword,
          },
        });
        await tx.provider.create({
          data: {
            users: { connect: { id: createUser.id } },
            provider: provider_type.local,
          },
        });

        const AccessTokenPayload: AccessTokenPayload = {
          uuidKey: createUser.uuid_key,
          email: createUser.email,
          nickname: nickname,
          imageUrl: signupData.imageUrl || null,
        };

        const accessToken = this.#fastify.jwt.sign(AccessTokenPayload, {
          expiresIn: this.#fastify.config.ACCESS_TOKEN_EXPIRATION,
        });
        const refreshToken = this.#fastify.jwt.sign(
          {},
          { expiresIn: this.#fastify.config.REFRESH_TOKEN_EXPIRATION },
        );

        this.#fastify.redis.set(createUser.uuid_key, refreshToken);

        return { accessToken, refreshToken };
      } catch (error) {
        throw this.#fastify.httpErrors.internalServerError(
          'Error creating user',
        );
      }
    });
  }

  /**
   * Login
   * @param loginData Login data
   * @returns Token pair with access and refresh tokens
   */
  public async login(
    loginData: Static<typeof localLoginSchema.body>,
  ): Promise<TokenPair> {
    return await this.#fastify.prisma.$transaction(async (tx) => {
      const searchUser = await tx.users.findUnique({
        where: { email: loginData.email },
      });
      if (!searchUser) {
        throw this.#fastify.httpErrors.unauthorized(
          'Invalid email or password',
        );
      }
      const searchPassword = await tx.password.findUnique({
        where: { user_id: searchUser.id },
      });
      if (!searchPassword) {
        throw this.#fastify.httpErrors.unauthorized(
          'Invalid email or password',
        );
      }
      // Compare password
      const comparePassword = await bcrypt.compare(
        loginData.password,
        searchPassword.password,
      );
      if (!comparePassword) {
        throw this.#fastify.httpErrors.unauthorized(
          'Invalid email or password',
        );
      }
      const profile = await tx.profile.findUnique({
        where: { user_id: searchUser.id },
      });
      if (!profile) {
        throw this.#fastify.httpErrors.internalServerError(
          'Error finding user profile',
        );
      }

      const AccessTokenPayload: AccessTokenPayload = {
        uuidKey: searchUser.uuid_key,
        email: searchUser.email,
        nickname: profile.nickname,
        imageUrl: profile.image_url,
      };

      const accessToken = this.#fastify.jwt.sign(AccessTokenPayload, {
        expiresIn: this.#fastify.config.ACCESS_TOKEN_EXPIRATION,
      });
      const refreshToken = this.#fastify.jwt.sign(
        {},
        { expiresIn: this.#fastify.config.REFRESH_TOKEN_EXPIRATION },
      );

      this.#fastify.redis.set(searchUser.uuid_key, refreshToken);

      return { accessToken, refreshToken };
    });
  }
}
