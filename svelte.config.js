import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import adapter from "@sveltejs/adapter-node";

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    alias: {
      $front: "scripts/front-end",
      "$front/*": "scripts/front-end/*",
      $commun: "scripts/commun",
      "$commun/*": "scripts/commun/*",
      $server: "scripts/server",
      "$server/*": "scripts/server/*",
      $types: "scripts/types",
      "$types/*": "scripts/types/*",
    },
  },
};
