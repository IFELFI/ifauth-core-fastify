import { Type } from "@sinclair/typebox";

export const localSignupSchema = {
  body: Type.Object({
    nickname: Type.Optional(Type.String({ minLength: 3, maxLength: 20 })),
    email: Type.String({ format: "email" }),
    password: Type.String({ minLength: 8 }),
    imageUrl: Type.Optional(Type.String({ format: "uri" })),
  }),
}

export const localLoginSchema = {
  body: Type.Object({
    email: Type.String({ format: "email" }),
    password: Type.String({ minLength: 8 }),
  }),
}