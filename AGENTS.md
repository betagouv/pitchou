# Conventions

## Code style

- Write code in English: identifiers, variables, functions, and comments.
- Domain names stay in French, but without accents (e.g. `demandeur`, `piece`, `porteurDeProjet`, `derogation`).
- UI strings shown to users stay in French, with accents.

## Project structure

- When a stable entry file owns several private companion modules, keep the entry file in place and group its companions in a folder with the same name.
- Private TypeScript filenames inside a feature folder must not repeat context already provided by the folder. Use concise semantic names such as `dossier/access.ts` or `dossierCreationModel/payload.ts`.
- Keep Svelte component filenames descriptive; component names should remain understandable in imports, editor tabs, and debugging tools.
- Keep shared modules at the nearest common parent instead of placing them inside one consumer's private folder.
- Avoid one-file folders and unnecessary nesting. Do not reorganize generated files, migrations, seeds, or SvelteKit route files solely to satisfy these conventions.

## Git

- Write commit messages in English (conventional commits: `feat`, `fix`, etc.).
- Write branch names in English.
- Domain names in commits and branch names stay in French without accents.
