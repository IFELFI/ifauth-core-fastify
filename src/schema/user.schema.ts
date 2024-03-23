import { Type } from '@sinclair/typebox';

export const updateProfileSchema = {
  body: Type.Object({
    nickname: Type.Optional(Type.String({ minLength: 3, maxLength: 32 })),
    imageUrl: Type.Optional(Type.String({ format: 'uri', maxLength: 256 })),
  }),
};

export const updatePasswordSchema = {
  body: Type.Object({
    oldPassword: Type.String({ minLength: 8, maxLength: 256 }),
    newPassword: Type.String({ minLength: 8, maxLength: 256 }),
  }),
};

export const updateEmailSchema = {
  body: Type.Object({
    email: Type.String({ format: 'email' }),
  }),
};
