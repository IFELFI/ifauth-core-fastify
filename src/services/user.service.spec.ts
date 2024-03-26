import { it, describe, beforeEach, expect, jest, beforeAll } from '@jest/globals';
import { UserService } from './user.service';
import { FastifyInstance } from 'fastify';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { v4 as uuidv4 } from 'uuid';

describe('UserService', () => {
  const uuidKey = uuidv4();
  const email = 'test@ifelfi.com';
  let service: UserService;
  let fastify: DeepMockProxy<FastifyInstance>;
  beforeAll(() => {
    fastify = mockDeep<FastifyInstance>();
    service = new UserService(fastify);

    jest
      .spyOn(fastify.httpErrors, 'internalServerError')
      .mockImplementation((msg?: string) => {
        throw new Error(msg || 'Internal server error');
      });

    jest
      .spyOn(fastify.httpErrors, 'notFound')
      .mockImplementation((msg?: string) => {
        throw new Error(msg || 'Not found');
      });
  });
  describe('logout', () => {
    it('should logout user', async () => {
      jest.spyOn(fastify.prisma.users, 'findUnique').mockResolvedValue({
        id: 1,
        uuid_key: uuidKey,
        email,
      });
      jest.spyOn(fastify.redis, 'del').mockResolvedValue(1);
      expect(await service.logout(uuidKey)).toBe(true);
    });

    it('should throw not found error', async () => {
      jest.spyOn(fastify.prisma.users, 'findUnique').mockResolvedValue(null);
      await expect(service.logout(uuidKey)).rejects.toThrow('User not found');
    });

    it('should throw internal server error', async () => {
      jest
        .spyOn(fastify.prisma.users, 'findUnique')
        .mockRejectedValue(new Error());
      await expect(service.logout(uuidKey)).rejects.toThrow(
        'Failed to find user',
      );
    });

    it('should throw internal server error when delete refresh token from server', async () => {
      jest.spyOn(fastify.prisma.users, 'findUnique').mockResolvedValue({
        id: 1,
        uuid_key: uuidKey,
        email,
      });
      jest.spyOn(fastify.redis, 'del').mockRejectedValue(new Error());
      await expect(service.logout(uuidKey)).rejects.toThrow(
        'Failed to delete refresh token from server',
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      jest.spyOn(fastify.prisma.users, 'delete').mockResolvedValue({
        id: 1,
        uuid_key: uuidKey,
        email,
      });
      jest.spyOn(fastify.redis, 'del').mockResolvedValue(1);
      expect(await service.deleteUser(uuidKey)).toBe(true);
    });

    it('should throw internal server error', async () => {
      jest.spyOn(fastify.prisma.users, 'delete').mockRejectedValue(new Error());
      await expect(service.deleteUser(uuidKey)).rejects.toThrow(
        'Failed to delete user',
      );
    });

    it('should throw internal server error when delete refresh token from server', async () => {
      jest.spyOn(fastify.prisma.users, 'delete').mockResolvedValue({
        id: 1,
        uuid_key: uuidKey,
        email,
      });
      jest.spyOn(fastify.redis, 'del').mockRejectedValue(new Error());
      await expect(service.deleteUser(uuidKey)).rejects.toThrow(
        'Failed to delete refresh token from server',
      );
    });
  });
});
