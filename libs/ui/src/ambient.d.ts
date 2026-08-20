// This package's tsconfig has no `vite/client` types (the apps get them from SvelteKit's
// generated tsconfig), so the one Vite construct used here is declared by hand. It merges as
// an overload wherever `vite/client` is present.
interface ImportMeta {
  glob(
    pattern: string,
    options: { eager: true; query: "?url"; import: "default" },
  ): Record<string, unknown>;
}
