import { it, afterAll, beforeAll, describe, expect } from "@jest/globals";
import { FastifyInstance } from "fastify";
import build from "../../src/app";
import { postgresClient, postgresContainer, redisContainer } from "../setup-e2e";

describe("Auth local", () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await build({}, {
      ...process.env,
      DATABASE_URL: postgresContainer.getConnectionUri(),
      REDIS_URL: redisContainer.getConnectionUrl(),
    });
  })

  afterAll(async () => {
    await server.close();
  })

  describe("[POST] /auth/local", () => {
    describe("Signup", () => {
      it("should return 200 and a token when signup with proper data", async () => {
        const response = await server.inject({
          method: 'POST',
          url: '/auth/local/signup',
          payload: {
            email: 'test@ifelfi.com',
            password: 'password'
          }
        });
        expect(response.statusCode).toBe(201);
        expect(response.headers['authorization']).toBeDefined();
        expect(response.cookies).toBeDefined();
      });
    });

    describe("Login", () => {
    });
  });
});