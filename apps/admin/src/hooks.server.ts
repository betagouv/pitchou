import * as Sentry from "@sentry/sveltekit";

// Captures errors thrown during server-side rendering and in load functions.
export const handleError = Sentry.handleErrorWithSentry();

// sentryHandle() instruments incoming requests and creates the root span.
// To add more handles, compose with sequence():
//   import { sequence } from "@sveltejs/kit/hooks";
//   export const handle = sequence(Sentry.sentryHandle(), myHandle);
export const handle = Sentry.sentryHandle();
