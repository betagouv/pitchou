import { defineEnvVars } from "@sveltejs/kit/env";

const optionalString = (value: string | undefined) => value;

export const variables = defineEnvVars({
  PUBLIC_PITCHOU_ENV: { public: true, schema: optionalString },
  PUBLIC_SENTRY_DEV_ENV: { public: true, schema: optionalString },
  PUBLIC_SENTRY_DSN_ADMIN: { public: true, schema: optionalString },
  PUBLIC_SITE_URL_PITCHOU: { public: true, schema: optionalString },
  URL_STAGING: { schema: optionalString },
  URL_VISIO: { schema: optionalString },
  URL_WEBINAIRE: { schema: optionalString },
  URL_GRIST_METRIQUES: { schema: optionalString },
  URL_VAULTWARDEN: { schema: optionalString },
  URL_PAD_RITUEL: { schema: optionalString },
  URL_FICHIERS: { schema: optionalString },
  URL_GOOGLE_DRIVE: { schema: optionalString },
});
