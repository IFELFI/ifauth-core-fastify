import { FastifyInstance } from 'fastify';

export class UserService {
  #fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.#fastify = fastify;
  }

  /**
   * Logout user
   * @param uuidKey User's UUID key
   * @returns Promise of logout result
   */
  public async logout(uuidKey: string): Promise<boolean> {
    const findUser = await this.#fastify.prisma.users.findUnique({
      where: { uuid_key: uuidKey },
    });
    if (!findUser) {
      throw this.#fastify.httpErrors.notFound('User not found');
    }
    // Delete refresh token from Redis
    await this.#fastify.redis.del(uuidKey);
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
        throw this.#fastify.httpErrors.internalServerError(error.message);
      });
    await this.#fastify.redis.del(uuidKey).catch((error) => {
      throw this.#fastify.httpErrors.internalServerError(error.message);
    });
    return true;
  }
}
