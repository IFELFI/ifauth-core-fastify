import { provider_type } from '@prisma/client';
import { FastifyInstance } from 'fastify';

export class UserService {
  #fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.#fastify = fastify;
  }

  /**
   * Get user profile
   * @param uuidKey User's UUID key
   * @returns user profile
   */
  public async getProfile(uuidKey: string): Promise<{
    email: string;
    nickname: string;
    imageUrl: string | null;
    joinDate: Date;
    updateDate: Date;
    provider: provider_type;
  }> {
    const user = await this.#fastify.prisma.users
      .findUnique({
        where: { uuid_key: uuidKey },
      })
      .catch((error) => {
        throw this.#fastify.httpErrors.internalServerError(
          'Failed to find user',
        );
      });
    if (!user) {
      throw this.#fastify.httpErrors.notFound('User not found');
    }

    const profile = await this.#fastify.prisma.profile
      .findUnique({
        where: { user_id: user.id },
      })
      .catch((error) => {
        throw this.#fastify.httpErrors.internalServerError(
          'Failed to find user profile',
        );
      });
    if (!profile) {
      throw this.#fastify.httpErrors.notFound('User profile not found');
    }

    const provider = await this.#fastify.prisma.provider
      .findUnique({
        where: { user_id: user.id },
      })
      .catch((error) => {
        throw this.#fastify.httpErrors.internalServerError(
          'Failed to find user provider',
        );
      });
    if (!provider) {
      throw this.#fastify.httpErrors.notFound('User provider not found');
    }

    return {
      email: user.email,
      nickname: profile.nickname,
      imageUrl: profile.image_url,
      joinDate: profile.join_date,
      updateDate: profile.update_date,
      provider: provider.provider,
    };
  }

  /**
   * Logout user
   * @param uuidKey User's UUID key
   * @returns Promise of logout result
   */
  public async logout(uuidKey: string): Promise<boolean> {
    const findUser = await this.#fastify.prisma.users
      .findUnique({
        where: { uuid_key: uuidKey },
      })
      .catch((error) => {
        throw this.#fastify.httpErrors.internalServerError(
          'Failed to find user',
        );
      });
    if (!findUser) {
      throw this.#fastify.httpErrors.notFound('User not found');
    }
    // Delete refresh token from Redis
    await this.#fastify.redis.del(uuidKey).catch((error) => {
      throw this.#fastify.httpErrors.internalServerError(
        'Failed to delete refresh token from server',
      );
    });
    return true;
  }

  /**
   * Delete user
   * @param uuidKey User's UUID key
   * @returns Promise of delete user result
   */
  public async deleteUser(uuidKey: string): Promise<boolean> {
    await this.#fastify.prisma.users
      .delete({ where: { uuid_key: uuidKey } })
      .catch((error) => {
        throw this.#fastify.httpErrors.internalServerError(
          'Failed to delete user',
        );
      });
    await this.#fastify.redis.del(uuidKey).catch((error) => {
      throw this.#fastify.httpErrors.internalServerError(
        'Failed to delete refresh token from server',
      );
    });
    return true;
  }
}
