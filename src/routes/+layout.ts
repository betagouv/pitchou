import { browser } from "$app/environment";
import { init, consumeSecretFromURL } from "$front/actions/main.js";

export const ssr = false;
export const prerender = false;
export const trailingSlash = "never";

let initialised: Promise<unknown> | undefined;

export const load = async ({ url }) => {
  if (browser && !initialised) {
    initialised = (async () => {
      await init();
      await consumeSecretFromURL(url).catch(() => {});
    })();
  }
  if (initialised) {
    await initialised;
  }
  return {};
};
