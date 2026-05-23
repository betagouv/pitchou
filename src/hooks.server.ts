import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
  const start = Date.now();
  const response = await resolve(event);
  console.log(
    `${event.request.method} ${event.url.pathname} ${response.status} ${Date.now() - start}ms`,
  );
  return response;
};
