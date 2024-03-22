import { it, beforeAll, afterAll, expect, describe } from "@jest/globals";
import { FastifyInstance } from "fastify";
import build from "../src/app";
import { expiredAccessToken, postgresContainer, redisContainer, refreshToken, signer, accessToken, redisClient, accessTokenPayload, expiredAccessTokenPayload, expiredRefreshToken } from "./setup-e2e";
import { log } from "console";

describe("Token", () => {
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
  });

  /**
   * Success handling
   */

  describe("[GET] /token/validate", () => {
    it("should validate and refresh token if access token is valid", async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/token/validate',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        cookies: {
          'refresh': signer.sign(refreshToken)
        }
      });
      expect(response.statusCode).toBe(200);
      expect(response.headers['authorization']).toBeDefined();
      expect(response.cookies).toBeDefined();
    });

    it("should validate and refresh token if access token is expired but refresh token is valid", async () => {
      await redisClient.set(expiredAccessTokenPayload.uuidKey, refreshToken)
      const response = await server.inject({
        method: 'GET',
        url: '/token/validate',
        headers: {
          'Authorization': `Bearer ${expiredAccessToken}`
        },
        cookies: {
          'refresh': signer.sign(refreshToken)
        }
      });
      expect(response.statusCode).toBe(200);
      expect(response.headers['authorization']).toBeDefined();
      expect(response.cookies).toBeDefined();
    });

    it("should not validate and refresh token if access token is expired and refresh token is expired", async () => {
      await redisClient.set(expiredAccessTokenPayload.uuidKey, expiredRefreshToken)
      const response = await server.inject({
        method: 'GET',
        url: '/token/validate',
        headers: {
          'Authorization': `Bearer ${expiredAccessToken}`
        },
        cookies: {
          'refresh': signer.sign(expiredRefreshToken)
        }
      });
      expect(response.statusCode).toBe(401);
    });
  });
});

