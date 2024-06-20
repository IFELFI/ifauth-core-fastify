import { Type } from '@sinclair/typebox';

export const localSignupSchema = {
  body: Type.Object({
    nickname: Type.Optional(Type.String({ minLength: 3, maxLength: 32 })),
    email: Type.String({ format: 'email' }),
    password: Type.String({ minLength: 8, maxLength: 256 }),
    imageUrl: Type.Optional(Type.String({ format: 'uri', maxLength: 256 })),
  }),
};

export const localLoginSchema = {
  body: Type.Object({
    email: Type.String({ format: 'email' }),
    password: Type.String({ minLength: 8, maxLength: 256 }),
    autoLogin: Type.Boolean({ default: false }),
  }),
};

export const codeAuthSchema = {
  querystring: Type.Object({
    code: Type.String(),
  }),
};
