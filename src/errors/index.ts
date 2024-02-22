import createError from "@fastify/error";

const requestError = createError<[string]>('RequestError', '[BadRequest] %s', 400);

const serverError = createError<[string]>('ServerError', '[InternalServerError] %s', 500);

export {
  requestError,
  serverError
}