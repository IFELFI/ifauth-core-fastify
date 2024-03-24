import { it, describe, beforeAll, jest } from '@jest/globals';
import { localSignupSchema } from '../../schema/auth.schema';
import { Static } from '@sinclair/typebox';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { FastifyInstance } from 'fastify';
import { AuthLocalService } from './local.service';

describe('AuthLocalService', () => {
  const email = 'test@ifelfi.com';
  const nickname = 'test';
  const password = 'password';
  let service: AuthLocalService;
  let fastify: DeepMockProxy<FastifyInstance>;
  beforeAll(() => {
    fastify = mockDeep<FastifyInstance>();
    service = new AuthLocalService(fastify);

    jest
      .spyOn(fastify.httpErrors, 'conflict')
      .mockImplementation((msg?: string) => {
        throw new Error(msg || 'Conflict');
      });
    jest
      .spyOn(fastify.httpErrors, 'internalServerError')
      .mockImplementation((msg?: string) => {
        throw new Error(msg || 'Internal server error');
      });
    jest
      .spyOn(fastify.httpErrors, 'unauthorized')
      .mockImplementation((msg?: string) => {
        throw new Error(msg || 'Unauthorized');
      });
  });
  describe('signup', () => {
    // working on
    // should add prisma spyOn

    it('should return token pair with access and refresh tokens', () => {
      const signupData: Static<typeof localSignupSchema.body> = {
        email: email,
        nickname: nickname,
        password: password,
      };
      const result = service.signup(signupData);
    });
  });
});
