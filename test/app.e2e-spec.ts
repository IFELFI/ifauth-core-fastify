import { beforeAll, describe, expect, it } from "@jest/globals";
import build from "../src/app";
import { FastifyInstance } from "fastify";
import { log } from "console";
import { postgresContainer, redisContainer } from "./setup-e2e";

describe("App", () => {
  let server: FastifyInstance;
  beforeAll(async () => {
    server = await build({}, {
      ...process.env,
      DATABASE_URL: postgresContainer.getConnectionUri(),
      REDIS_URL: redisContainer.getConnectionUrl(),
    });
  })

  it("should be defined", () => {
    expect(server).toBeDefined();
  });

  it("should have a config object", () => {
    expect(server.config).toBeDefined();
  });
});
