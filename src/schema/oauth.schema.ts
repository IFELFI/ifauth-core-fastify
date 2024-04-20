import { Type } from "@sinclair/typebox";
import { localLoginSchema } from "./auth.schema";

export const oauthSchema = {
  querystring: Type.Object({
    redirectUrl: Type.String({ format: 'uri' }),
  }),
  body: localLoginSchema.body,
};