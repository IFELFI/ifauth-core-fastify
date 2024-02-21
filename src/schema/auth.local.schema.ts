import { Type } from "@sinclair/typebox";

export const signupSchema = {
  body: Type.Object({
    nickname: Type.String({ minLength: 3, maxLength: 20 }),
    email: Type.String({ format: "email" }),
    password: Type.String({ minLength: 8 }),
    imageUrl: Type.String({ format: "uri" }),
  }),
}

export const loginSchema = {
  body: Type.Object({
    email: Type.String({ format: "email" }),
    password: Type.String({ minLength: 8 }),
  }),
}