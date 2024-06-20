import { randomBytes } from 'crypto';
import { FastifyInstance, FastifyRequest } from 'fastify';

export class AutoLoginService {
  #fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.#fastify = fastify;
  }

  /**
   * Issue auto login code
   * @param id user id
   * @param address user address
   * @returns Auto login code
   */
  public async issueAutoLoginCode(
    id: number,
    address: string,
  ): Promise<string> {
    return await this.#fastify.prisma.$transaction(async (tx) => {
      const code = randomBytes(16).toString('hex');
      const existingCode = await tx.auto_login_code.findFirst({
        where: {
          user_id: id,
          target_address: address,
        }
      });
      if (existingCode) {
        await tx.auto_login_code.delete({
          where: {
            id: existingCode.id,
          },
        });
      }
      const result = await tx.auto_login_code.create({
        data: {
          users: { connect: { id: id } },
          code: code,
          target_address: address,
          expire_date: new Date(
            Date.now() + this.#fastify.config.AUTO_LOGIN_CODE_EXPIRATION * 1000,
          ),
        },
      });
      return result.code;
    });
  }

  /**
   * Verify auto login code
   * @param code Auto login code
   * @param address User address
   * @returns New auto login code
   */
  public async verifyAutoLoginCode(
    code: string,
    address: string,
  ): Promise<string> {
    const prisma = this.#fastify.prisma;

    const storedCode = await prisma.auto_login_code.findUnique({
      where: {
        code: code,
      },
    });
    if (!storedCode) {
      throw this.#fastify.httpErrors.badRequest('Invalid code' + code);
    }
    if (storedCode.target_address !== address) {
      throw this.#fastify.httpErrors.badRequest('Invalid address');
    }
    if (storedCode.expire_date < new Date()) {
      throw this.#fastify.httpErrors.badRequest('Expired code');
    }
    return this.issueAutoLoginCode(storedCode.user_id, address);
  }

  /**
   * Parse auto login code from request
   * @param request Fastify request
   * @returns Auto login code
   */
  public parseAutoLoginCode(request: FastifyRequest): string {
    const unsignedCode = request.unsignCookie(
      request.cookies.autoLogin ?? '',
    );
    const autoLoginCode = unsignedCode.value;

    if (!autoLoginCode) {
      throw this.#fastify.httpErrors.badRequest('Invalid auto login code');
    }
    return autoLoginCode;
  }
}
