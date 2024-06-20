import { provider_type, users } from '@prisma/client';
import { FastifyTypebox } from '../../app';
import { localLoginSchema, localSignupSchema } from '../../schema/auth.schema';
import { Static } from '@sinclair/typebox';
import bcrypt from 'bcrypt';

export class AuthLocalService {
  #fastify: FastifyTypebox;

  constructor(fastify: FastifyTypebox) {
    this.#fastify = fastify;
  }

  /**
   * Signup
   * @param signupData Signup data
   * @returns User id
   */
  public async signup(
    signupData: Static<typeof localSignupSchema.body>,
  ): Promise<number> {
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

        return createUser.id;
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
   * @returns User id
   */
  public async login(
    loginData: Static<typeof localLoginSchema.body>,
  ): Promise<number> {
    const prisma = this.#fastify.prisma;
    const searchUser = await prisma.users.findUnique({
      where: { email: loginData.email },
    });
    if (!searchUser) {
      throw this.#fastify.httpErrors.unauthorized('Invalid email or password');
    }
    const provider = await prisma.provider.findUnique({
      where: { user_id: searchUser.id },
    });
    if (!provider || provider.provider !== provider_type.local) {
      throw this.#fastify.httpErrors.badRequest(
        'This email is registered with a different provider',
      );
    }
    const searchPassword = await prisma.password.findUnique({
      where: { user_id: searchUser.id },
    });
    if (!searchPassword) {
      throw this.#fastify.httpErrors.unauthorized('Invalid email or password');
    }
    // Compare password
    const comparePassword = await bcrypt.compare(
      loginData.password,
      searchPassword.password,
    );
    if (!comparePassword) {
      throw this.#fastify.httpErrors.unauthorized('Invalid email or password');
    }
    const profile = await prisma.profile.findUnique({
      where: { user_id: searchUser.id },
    });
    if (!profile) {
      throw this.#fastify.httpErrors.internalServerError(
        'Error finding user profile',
      );
    }

    return searchUser.id;
  }
}
