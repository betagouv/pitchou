// Server-side Sentry init. Loaded early via SvelteKit's experimental
// `instrumentation.server` hook. The server `handleError` lives in hooks.server.ts.
import * as Sentry from "@sentry/sveltekit";
import { env } from "$env/dynamic/public";
Sentry.init({
  dsn: env.PUBLIC_SENTRY_DSN_ADMIN,
  // Events with the "development" environment are not reported in the Sentry interface.
  // Therefore, in development, the environment name should be "dev".
  // This is a known issue in Beta and cannot be fixed because only the provider
  // has the permissions to configure the self-hosted Sentry instance.
  environment: env.PUBLIC_SENTRY_DEV_ENV ?? env.PUBLIC_PITCHOU_ENV,
  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/sveltekit/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },
  // In the Beta Sentry instance, the rate limiting system is implemented at the Nginx level, and the rule applies per project.
  // To avoid being impacted by these limits, reduce the trace rate at the SDK level
  tracesSampleRate: 0.1,
  sampleRate: 1.0,
});
