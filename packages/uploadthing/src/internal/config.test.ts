import { after } from "node:test";
import * as S from "@effect/schema/Schema";
import { it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import { afterEach, beforeEach, describe, expect } from "vitest";

import { UploadThingError } from "@uploadthing/shared";

import { configProvider, IngestUrl, UTToken } from "./config";
import { UploadThingToken } from "./shared-schemas";

const app1TokenData = {
  apiKey: "sk_foo",
  appId: "app-1",
  regions: ["fra1"] as const,
};
const app2TokenData = {
  apiKey: "sk_bar",
  appId: "app-2",
  regions: ["dub1"] as const,
};

beforeEach(() => {
  process.env = {} as any;
  // import.meta.env = {} as any;
});

describe("utToken", () => {
  it.effect("fails if no token is provided as env", () =>
    Effect.gen(function* () {
      const token = yield* UTToken.pipe(
        Effect.provide(Layer.setConfigProvider(configProvider(null))),
        Effect.exit,
      );

      expect(token).toEqual(
        Exit.fail(
          new UploadThingError({
            code: "MISSING_ENV",
            message:
              "Missing token. Please set the `UPLOADTHING_TOKEN` environment variable or provide a token manually through config.",
          }),
        ),
      );
    }),
  );

  it.effect("fails if an invalid token is provided", () =>
    Effect.gen(function* () {
      process.env.UPLOADTHING_TOKEN = "some-token-that-is-not-a-token";

      const token = yield* UTToken.pipe(
        Effect.provide(Layer.setConfigProvider(configProvider(null))),
        Effect.exit,
      );

      expect(token).toEqual(
        Exit.fail(
          new UploadThingError({
            code: "INVALID_SERVER_CONFIG",
            message:
              "Invalid token. A token is a base64 encoded JSON object matching { apiKey: string, appId: string, regions: string[] }.",
          }),
        ),
      );
    }),
  );

  it.effect("succeeds if token is provided as env", () =>
    Effect.gen(function* () {
      process.env.UPLOADTHING_TOKEN =
        yield* S.encode(UploadThingToken)(app1TokenData);

      const token = yield* UTToken.pipe(
        Effect.provide(Layer.setConfigProvider(configProvider(null))),
        Effect.exit,
      );

      expect(token).toEqual(Exit.succeed(app1TokenData));
    }),
  );

  it.effect("with import.meta.env", () =>
    Effect.gen(function* () {
      import.meta.env.UPLOADTHING_TOKEN =
        yield* S.encode(UploadThingToken)(app1TokenData);

      const token = yield* UTToken.pipe(
        Effect.provide(Layer.setConfigProvider(configProvider(null))),
        Effect.exit,
      );

      expect(token).toEqual(Exit.succeed(app1TokenData));

      delete import.meta.env.UPLOADTHING_TOKEN;
    }),
  );

  it.effect("fails if no token is provided as option", () =>
    Effect.gen(function* () {
      const token = yield* UTToken.pipe(
        Effect.provide(
          Layer.setConfigProvider(configProvider({ noToken: "here" })),
        ),
        Effect.exit,
      );

      expect(token).toEqual(
        Exit.fail(
          new UploadThingError({
            code: "MISSING_ENV",
            message:
              "Missing token. Please set the `UPLOADTHING_TOKEN` environment variable or provide a token manually through config.",
          }),
        ),
      );
    }),
  );

  it.effect("fails if an invalid token is provided as option", () =>
    Effect.gen(function* () {
      const badToken = "some-token";

      const token = yield* UTToken.pipe(
        Effect.provide(
          Layer.setConfigProvider(configProvider({ token: badToken })),
        ),
        Effect.exit,
      );

      expect(token).toEqual(
        Exit.fail(
          new UploadThingError({
            code: "INVALID_SERVER_CONFIG",
            message:
              "Invalid token. A token is a base64 encoded JSON object matching { apiKey: string, appId: string, regions: string[] }.",
          }),
        ),
      );
    }),
  );

  it.effect("succeeds if token is provided as option", () =>
    Effect.gen(function* () {
      const testTokenStr = yield* S.encode(UploadThingToken)(app1TokenData);

      const token = yield* UTToken.pipe(
        Effect.provide(
          Layer.setConfigProvider(configProvider({ token: testTokenStr })),
        ),
        Effect.exit,
      );

      expect(token).toEqual(Exit.succeed(app1TokenData));
    }),
  );

  it.effect("options take precedence over env", () =>
    Effect.gen(function* () {
      process.env.UPLOADTHING_TOKEN =
        yield* S.encode(UploadThingToken)(app1TokenData);

      const token2Str = yield* S.encode(UploadThingToken)(app2TokenData);

      const token = yield* UTToken.pipe(
        Effect.provide(
          Layer.setConfigProvider(configProvider({ token: token2Str })),
        ),
        Effect.exit,
      );

      expect(token).toEqual(Exit.succeed(app2TokenData));
    }),
  );
});

describe("ingest url infers correctly", () => {
  it.effect("takes from env if provided", () =>
    Effect.gen(function* () {
      process.env.UPLOADTHING_TOKEN =
        yield* S.encode(UploadThingToken)(app1TokenData);
      process.env.UPLOADTHING_INGEST_URL = "http://localhost:1234";

      const url = yield* IngestUrl.pipe(
        Effect.provide(Layer.setConfigProvider(configProvider(null))),
        Effect.exit,
      );

      expect(url).toEqual(Exit.succeed("http://localhost:1234"));
    }),
  );

  it.effect("infers from token region if no env is provided", () =>
    Effect.gen(function* () {
      process.env.UPLOADTHING_TOKEN =
        yield* S.encode(UploadThingToken)(app1TokenData);

      const url = yield* IngestUrl.pipe(
        Effect.provide(Layer.setConfigProvider(configProvider(null))),
        Effect.exit,
      );

      expect(url).toEqual(Exit.succeed("https://fra1.ingest.uploadthing.com"));
    }),
  );
});