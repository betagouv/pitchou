import { defineEnvVars } from "@sveltejs/kit/env";

const optionalString = (value: string | undefined) => value;

export const variables = defineEnvVars({
  PUBLIC_PITCHOU_ENV: { public: true, schema: optionalString },
  PUBLIC_SENTRY_DEV_ENV: { public: true, schema: optionalString },
  PUBLIC_SENTRY_DSN_INSTRUCTEUR: { public: true, schema: optionalString },
  PUBLIC_MATOMO_SITE_ID: { public: true, schema: optionalString },
});
