import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import adapter from "@sveltejs/adapter-node";

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    alias: {
      $front: "front-end",
      "$front/*": "front-end/*",
    },
  },
};
