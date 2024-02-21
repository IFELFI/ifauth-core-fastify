-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "auth";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "member";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."provider_type" AS ENUM ('local', 'google');

-- CreateTable
CREATE TABLE "auth"."password" (
    "password_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "password" VARCHAR(256) NOT NULL,
    "update_date" TIMESTAMPTZ(6),

    CONSTRAINT "pk_password" PRIMARY KEY ("password_id")
);

-- CreateTable
CREATE TABLE "auth"."provider" (
    "provider_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "provider" "public"."provider_type" NOT NULL,

    CONSTRAINT "pk_provider" PRIMARY KEY ("provider_id")
);

-- CreateTable
CREATE TABLE "auth"."social_info" (
    "social_info_id" SERIAL NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "social_code" VARCHAR(128) NOT NULL,
    "access_token" VARCHAR(256) NOT NULL,

    CONSTRAINT "pk_social_info" PRIMARY KEY ("social_info_id")
);

-- CreateTable
CREATE TABLE "member"."profile" (
    "profile_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "nickname" VARCHAR(64),
    "image_url" VARCHAR(128),
    "join_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_date" TIMESTAMPTZ(6),

    CONSTRAINT "pk_profile" PRIMARY KEY ("profile_id")
);

-- CreateTable
CREATE TABLE "member"."users" (
    "user_id" SERIAL NOT NULL,
    "uuid_key" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(64) NOT NULL,

    CONSTRAINT "pk_user" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uni_user_password" ON "auth"."password"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uni_user_provider" ON "auth"."provider"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uni_provider_social_info" ON "auth"."social_info"("provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "uni_user_profile" ON "member"."profile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uni_nickname" ON "member"."profile"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "uni_uuid_key" ON "member"."users"("uuid_key");

-- CreateIndex
CREATE UNIQUE INDEX "uni_email" ON "member"."users"("email");

-- AddForeignKey
ALTER TABLE "auth"."password" ADD CONSTRAINT "fk_user" FOREIGN KEY ("user_id") REFERENCES "member"."users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."provider" ADD CONSTRAINT "fk_user" FOREIGN KEY ("user_id") REFERENCES "member"."users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."social_info" ADD CONSTRAINT "fk_provider" FOREIGN KEY ("provider_id") REFERENCES "auth"."provider"("provider_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "member"."profile" ADD CONSTRAINT "fk_user" FOREIGN KEY ("user_id") REFERENCES "member"."users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

