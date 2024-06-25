import { provider_type } from '@prisma/client';
import { randomBytes } from 'crypto';
import { FastifyInstance, FastifyRequest } from 'fastify';

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
    uuidKey: string;
    email: string;
    nickname: string;
    imageUrl: string | null;
    joinDate: Date;
    updateDate: Date;
    provider: provider_type;
  }> {
    const user = await this.#fastify.prisma.member
      .findUnique({
        where: { uuid_key: uuidKey },
      })
      .catch(() => {
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
      .catch(() => {
        throw this.#fastify.httpErrors.internalServerError(
          'Failed to find user provider',
        );
      });
    if (!provider) {
      throw this.#fastify.httpErrors.notFound('User provider not found');
    }

    return {
      uuidKey: user.uuid_key,
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
    const findUser = await this.#fastify.prisma.member
      .findUnique({
        where: { uuid_key: uuidKey },
      })
      .catch(() => {
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
    await this.#fastify.prisma.member
      .delete({ where: { uuid_key: uuidKey } })
      .catch(() => {
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

  /**
   * Get SSID token
   * @param request Request object
   * @returns SSID token
   */
  public parseSSID(request: FastifyRequest): string | null {
    const unsignedSsidCookie = request.unsignCookie(request.cookies.SSID ?? '');
    const SSID = unsignedSsidCookie.value;

    return SSID;
  }

  /**
   * Verify SSID token
   * @param memberId
   * @param SSID SSID token
   * @returns Promise of SSID verification result
   */
  public async verifySSID(memberId: number, SSID: string | null): Promise<boolean> {
    if (SSID === null) {
      return false;
    }
    const ssid = await this.#fastify.prisma.ssid.findFirst({
      where: {
        user_id: memberId,
        SSID,
      },
    });

    return !!ssid;
  }

  /**
   * Issue SSID token
   * @param id member id
   * @returns SSID token
   */
  public async issueSSID(id: number): Promise<string> {
    const ssid = randomBytes(16).toString('hex');
    await this.#fastify.prisma.ssid.create({
      data: {
        member: {
          connect: {
            id,
          },
        },
        SSID: ssid,
      },
    });

    return ssid;
  }
}
