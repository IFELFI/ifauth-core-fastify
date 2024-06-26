import { it, afterAll, beforeAll, describe, expect } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import build from '../../src/app';
import { postgresContainer, redisContainer, setupData } from '../setup-e2e';

describe('Auth local', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await build(
      {},
      {
        ...process.env,
        DATABASE_URL: postgresContainer.getConnectionUri(),
        REDIS_URL: redisContainer.getConnectionUrl(),
      },
    );
  });

  afterAll(async () => {
    await server.close();
  });

  // describe('[POST] /auth/local/signup', () => {
  //   it('should return 200 and a token when signup with proper data', async () => {
  //     const response = await server.inject({
  //       method: 'POST',
  //       url: '/auth/local/signup',
  //       payload: {
  //         email: 'test@ifelfi.com',
  //         password: 'password',
  //       },
  //     });
  //     const data = JSON.parse(response.body);
  //     expect(response.statusCode).toBe(201);
  //     expect(data).toHaveProperty('code');
  //   });

  //   it('should return 400 when signup with invalid data', async () => {
  //     const response = await server.inject({
  //       method: 'POST',
  //       url: '/auth/local/signup',
  //       payload: {
  //         email: 'ifelfi.com',
  //       },
  //     });
  //     expect(response.statusCode).toBe(400);
  //   });

  //   it('should return 400 when signup with an existing email', async () => {
  //     const data = await setupData();
  //     const response = await server.inject({
  //       method: 'POST',
  //       url: '/auth/local/signup',
  //       payload: {
  //         email: data.user.user.email,
  //         password: 'password',
  //       },
  //     });
  //     expect(response.statusCode).toBe(409);
  //   });

  //   it('should return 400 when signup with an invalid email', async () => {
  //     const response = await server.inject({
  //       method: 'POST',
  //       url: '/auth/local/signup',
  //       payload: {
  //         email: 'invalid_email',
  //         password: 'password',
  //       },
  //     });
  //     expect(response.statusCode).toBe(400);
  //   });

  //   it('should return 400 when signup with an invalid short password', async () => {
  //     const response = await server.inject({
  //       method: 'POST',
  //       url: '/auth/local/signup',
  //       payload: {
  //         email: 'test@ifelfi.com',
  //         password: 'pass',
  //       },
  //     });
  //     expect(response.statusCode).toBe(400);
  //   });

  //   it('should return 400 when signup with an invalid long password', async () => {
  //     const response = await server.inject({
  //       method: 'POST',
  //       url: '/auth/local/signup',
  //       payload: {
  //         email: 'test@ifelfi.com',
  //         password: String('a').repeat(257),
  //       },
  //     });
  //     expect(response.statusCode).toBe(400);
  //   });
  // });

  describe('[POST] /auth/local/login', () => {
    it('should return 200 and a token when login with proper data', async () => {
      const data = await setupData();
      const response = await server.inject({
        method: 'POST',
        url: '/auth/local/login',
        payload: {
          email: data.user.member.email,
          password: data.user.realPassword,
        },
      });
      const body = JSON.parse(response.body);
      expect(response.statusCode).toBe(200);
      expect(body).toHaveProperty('code');
    });

    it('should return 200 with autoAuthCode when login with proper data and auto=true', async () => {
      const data = await setupData();
      const response = await server.inject({
        method: 'POST',
        url: '/auth/local/login',
        payload: {
          email: data.user.member.email,
          password: data.user.realPassword,
          auto: true,
        },
      });
      const body = JSON.parse(response.body);
      expect(response.statusCode).toBe(200);
      expect(body).toHaveProperty('code');
      expect(body).toHaveProperty('autoAuthCode');
    });

    it('should return 400 when login with invalid data', async () => {
      const data = await setupData();
      const response = await server.inject({
        method: 'POST',
        url: '/auth/local/login',
        payload: {
          email: data.user.member.email,
        },
      });
      expect(response.statusCode).toBe(400);
    });

    it('should return 401 when login with invalid password', async () => {
      const data = await setupData();
      const response = await server.inject({
        method: 'POST',
        url: '/auth/local/login',
        payload: {
          email: data.user.member.email,
          password: 'wrong_password',
        },
      });
      expect(response.statusCode).toBe(401);
    });

    it('should return 401 when login with invalid email', async () => {
      const data = await setupData();
      const response = await server.inject({
        method: 'POST',
        url: '/auth/local/login',
        payload: {
          email: 'wrong@ifelfi.com',
          password: data.user.password.password,
        },
      });
      expect(response.statusCode).toBe(401);
    });
  });
});
