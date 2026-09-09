# Footer regression

From `apps/instructeur`:

```sh
node --test tests/layout/dossier-footer.test.mjs
```

Requires Playwright Chromium and a working system font configuration. In a Nix
shell without one, set `FONTCONFIG_FILE` to a config pointing to installed fonts.

The test starts an isolated Vite server. It renders the real `Dossier.svelte`,
`DossierTabList.svelte` and application footer with `app.css` and the DSFR CSS/JS
shipped in `docs/style/dsfr`, not the potentially different npm version.
Data-dependent dossier children are stubbed. No API server or database is used.

At desktop and mobile widths it checks screenshot pixels above and along the
footer divider, long and short panels, keyboard tab navigation, retained inputs,
and an open DSFR dialog. List and public fixtures retain their grey footer gap.
