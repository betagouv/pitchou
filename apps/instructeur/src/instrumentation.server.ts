// Server-side Sentry init. Loaded early via SvelteKit's experimental
// `instrumentation.server` hook. The server `handleError` lives in hooks.server.ts.
import * as Sentry from "@sentry/sveltekit";
import { env } from "$env/dynamic/public";
Sentry.init({
  dsn: env.PUBLIC_SENTRY_DSN_INSTRUCTEUR,
  environment: env.PUBLIC_PITCHOU_ENV,
  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/sveltekit/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },
  // In the Beta Sentry instance, the rate limiting system is implemented at the Nginx level, and the rule applies per project.
  // To avoid being impacted by these limits, reduce the trace rate at the SDK level
  tracesSampleRate: 0.1, // Traces: 10% is sufficient in production
  sampleRate: 1.0, // Errors: Keep at 100%
});
