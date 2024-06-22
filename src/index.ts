import { FastifyRequest } from 'fastify';
import build from './app';
import fastifyUnderPressure from '@fastify/under-pressure';
import fs from 'fs';

async function run() {
  fs.mkdirSync(__dirname + '/../logs', { recursive: true });
  const server = await build({
    ajv: {
      customOptions: {
        removeAdditional: 'all',
        useDefaults: true,
        coerceTypes: true,
        allErrors: true,
      },
    },
    logger: {
      level: 'info',
      file: __dirname + '/../logs/logs.log',
      redact: ['req.headers.authorization'],
      serializers: {
        req(req: FastifyRequest) {
          return {
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: req.body,
            remoteAddress: req.ip,
            hostname: req.hostname,
            remotePort: req.connection.remotePort,
            cookie: JSON.stringify(req.headers.cookie),
          };
        },
      },
    },
    trustProxy: true,
  });

  server.register(fastifyUnderPressure, {
    maxEventLoopDelay: 1000,
    retryAfter: 50,
    maxHeapUsedBytes: 100000000,
    maxRssBytes: 100000000,
    maxEventLoopUtilization: 0.98,
    message: 'Server under heavy load, please try again later.',
  });

  const host = server.config.HOST;
  const port = server.config.PORT;

  await server.listen({ host, port });
  console.log(`Server listening on port ${port}`);
}

run();
