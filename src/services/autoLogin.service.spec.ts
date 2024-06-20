import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import { AutoLoginService } from "./autoLogin.service";
import { DeepMockProxy, mockDeep } from "jest-mock-extended";
import { FastifyInstance } from "fastify";
import { httpErrors } from "@fastify/sensible";
import { beforeEach } from "node:test";
import { auto_login_code } from "@prisma/client";

describe('autoLoginService', () => {
  let service: AutoLoginService;
  let fastify: DeepMockProxy<FastifyInstance>;

  const autoLoginCode: auto_login_code = {
    id: BigInt(1),
    code: 'code',
    user_id: 1,
    target_address: 'address',
    create_date: new Date(),
    expire_date: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 7),
  };

  beforeAll(() => {
    fastify = mockDeep<FastifyInstance>();
    service = new AutoLoginService(fastify);

    // mock config
    fastify.config = {
      HOST: 'localhost',
      PORT: 3000,
      ACCESS_TOKEN_EXPIRATION: 60 * 5,
      REFRESH_TOKEN_EXPIRATION: 60 * 60 * 24 * 3,
      AUTH_CODE_EXPIRATION: 60 * 3,
      AUTO_LOGIN_CODE_EXPIRATION: 60 * 60 * 24 * 7,
      DATABASE_URL: 'postgres://localhost:5432',
      REDIS_URL: 'redis://localhost:6379',
      TOKEN_SECRET: 'secret',
      COOKIE_SECRET: 'secret',
      SALT: 'salt',
      ISSUER: 'ifelfi.com',
    };

    /**
     * Mock Fastify instance methods
     */

    // mock fastify error methods
    jest
      .spyOn(fastify.httpErrors, 'badRequest')
      .mockImplementation((msg?: string) => {
        throw httpErrors.badRequest(msg);
      });

    // mock prisma methods
    jest
      .spyOn(fastify.prisma, '$transaction')
      .mockImplementation((callback) => callback(fastify.prisma));
  });

  describe('issueAutoLoginCode', () => {
    it('should return auto login code', async () => {
      const code = 'code';
      const address = 'address';
      jest
        .spyOn(fastify.prisma.auto_login_code, 'findFirst')
        .mockResolvedValue(autoLoginCode);
      jest
        .spyOn(fastify.prisma.auto_login_code, 'create')
        .mockResolvedValue(autoLoginCode);
      const result = await service.issueAutoLoginCode(1, address);

      expect(result).toEqual(code);
    });
  });

  describe('verifyAutoLoginCode', () => {
    it('should return new auto login code', async () => {
      const code = 'code';
      const address = 'address';
      jest
        .spyOn(fastify.prisma.auto_login_code, 'findUnique')
        .mockResolvedValue(autoLoginCode);
      jest
        .spyOn(fastify.prisma.auto_login_code, 'delete')
        .mockResolvedValue(autoLoginCode);
      jest
        .spyOn(service, 'issueAutoLoginCode')
        .mockResolvedValue(code);
      const result = await service.verifyAutoLoginCode(code, address);

      expect(result).toEqual(code);
    });
  });
});