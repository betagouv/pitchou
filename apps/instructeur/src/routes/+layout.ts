import { browser } from "$app/environment";
import { init } from "$lib/shared/main.ts";
import type { LayoutLoad } from "./$types.js";

export const ssr = false;
export const prerender = false;
export const trailingSlash = "never";

let initialised: Promise<unknown> | undefined;

export const load: LayoutLoad = async () => {
  if (browser && !initialised) {
    initialised = (async () => {
      await init();
    })();
  }
  if (initialised) {
    await initialised;
  }
  return {};
};
