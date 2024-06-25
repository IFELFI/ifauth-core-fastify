import { randomBytes } from 'crypto';
import { FastifyInstance, FastifyRequest } from 'fastify';

export class AutoLoginService {
  #fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.#fastify = fastify;
  }
  /**
   * Issue authorization code for auto login code
   * @param id User id
   * @returns Authorization code
   */
  public async issueAuthorizationCode(id: number): Promise<string> {
    const code = randomBytes(16).toString('hex');
    await this.#fastify.redis
      .set(code, id.toString(), 'EX', this.#fastify.config.AUTH_CODE_EXPIRATION)
      .catch(() => {
        throw this.#fastify.httpErrors.internalServerError('Set code error');
      });
    return code;
  }

  /**
   * Issue auto login code
   * @param code Authorization code for auto login
   * @param SSID SSID
   * @returns Auto login code
   */
  public async issueCode(
    code: string,
    SSID: string,
  ): Promise<string> {
    const id = await this.#fastify.redis
      .get(code)
      .catch(() => {
        throw this.#fastify.httpErrors.internalServerError('Get code error');
      })
      .then(async (result) => {
        if (!result) throw this.#fastify.httpErrors.notFound('Code not found');
        if (result.match(/^[0-9]+$/) === null)
          throw this.#fastify.httpErrors.internalServerError('Code error');
        await this.#fastify.redis.del(code).catch(() => {
          throw this.#fastify.httpErrors.internalServerError(
            'Delete code error',
          );
        });
        return parseInt(result);
      });

    const ssid = await this.#fastify.prisma.ssid.findFirst({
      where: {
        user_id: id,
        SSID: SSID,
      },
    });

    if (!ssid) {
      throw this.#fastify.httpErrors.badRequest('Invalid SSID');
    }

    return await this.#fastify.prisma.$transaction(async (tx) => {
      const code = randomBytes(64).toString('hex');
      const existingCode = await tx.auto_login_code.findUnique({
        where: {
          ssid: ssid.id,
        },
      });
      if (existingCode) {
        await tx.auto_login_code.update({
          where: {
            id: existingCode.id,
          },
          data: {
            code: code,
            create_date: new Date(),
            expire_date: new Date(
              Date.now() +
                this.#fastify.config.AUTO_LOGIN_CODE_EXPIRATION * 1000,
            ),
          },
        });
      } else {
        await tx.auto_login_code.create({
          data: {
            ssid: ssid.id,
            code: code,
            expire_date: new Date(
              Date.now() +
                this.#fastify.config.AUTO_LOGIN_CODE_EXPIRATION * 1000,
            ),
          },
        });
      }
      return code;
    });
  }

  /**
   * Verify auto login code
   * @param code Auto login code
   * @param SSID SSID
   * @returns New auto login code and user id
   */
  public async verifyAutoLoginCode(
    code: string,
    SSID: string,
  ): Promise<{
    id: number;
    code: string;
  }> {
    const prisma = this.#fastify.prisma;

    const storedCode = await prisma.auto_login_code.findUnique({
      where: {
        code: code,
      },
    });
    if (!storedCode) {
      throw this.#fastify.httpErrors.badRequest('Invalid code' + code);
    }

    const ssid = await prisma.ssid.findFirst({
      where: {
        id: storedCode.ssid,
      },
    });

    if (!ssid || ssid.SSID !== SSID) {
      throw this.#fastify.httpErrors.badRequest('Invalid client');
    }
    if (storedCode.expire_date < new Date()) {
      throw this.#fastify.httpErrors.badRequest('Expired code');
    }
    const newCode = randomBytes(16).toString('hex');
    await prisma.auto_login_code.update({
      where: {
        id: storedCode.id,
      },
      data: {
        code: newCode,
        create_date: new Date(),
        expire_date: new Date(
          Date.now() + this.#fastify.config.AUTO_LOGIN_CODE_EXPIRATION * 1000,
        ),
      },
    });
    return { id: ssid.user_id, code: code };
  }

  /**
   * Parse auto login code from request
   * @param request Fastify request
   * @returns Auto login code
   */
  public parseAutoLoginCode(request: FastifyRequest): string {
    const unsignedCode = request.unsignCookie(request.cookies.AUTO ?? '');
    const autoLoginCode = unsignedCode.value;

    if (!autoLoginCode) {
      throw this.#fastify.httpErrors.badRequest('Invalid auto login code');
    }
    return autoLoginCode;
  }
}
