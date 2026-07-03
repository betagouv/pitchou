import * as Sentry from "@sentry/sveltekit";

// Server-side Sentry init. Runs once at startup, before app code, so that
// auto-instrumentation (HTTP, pg, etc.) can hook in. The SDK is a no-op when
// the DSN is empty, so it is safe to ship this without Sentry configured.
Sentry.init({
  dsn: process.env.SENTRY_DSN_INSTRUCTEUR,
  environment: process.env.PUBLIC_PITCHOU_ENV,

  // In the Beta Sentry instance, the rate limiting system is implemented at the Nginx level, and the rule applies per project.
  // To avoid being impacted by these limits, reduce the trace rate at the SDK level
  tracesSampleRate: 0.1, // Traces: 10% is sufficient in production
  sampleRate: 1.0, // Errors: Keep at 100%
});
