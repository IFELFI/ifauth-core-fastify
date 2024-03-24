import { FastifyRequest } from 'fastify';
import build from './app';
async function run() {
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
          };
        },
      },
    },
  });
  const host = server.config.HOST;
  const port = server.config.PORT;

  await server.listen({ host, port });
  console.log(`Server listening on port ${port}`);
}

run();
