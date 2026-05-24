import { browser } from "$app/environment";
import { init, secretFromURL } from "$front/actions/main.js";

export const ssr = false;
export const prerender = false;
export const trailingSlash = "never";

let initialised: Promise<unknown> | undefined;

export const load = async () => {
  if (browser && !initialised) {
    initialised = (async () => {
      await init();
      await secretFromURL().catch(() => {});
    })();
  }
  if (initialised) {
    await initialised;
  }
  return {};
};
