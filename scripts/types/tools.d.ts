export type StringValues<T> = {
  [K in keyof T]: string;
};

type RequiredNotNull<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

export type PickNonNullable<T, K extends keyof T> = RequiredNotNull<Pick<T, K>>;

/**
 * Garder le type, sauf pour les propriété listées par K qui deviennent optionnelles
 */
export type PartialBy<T, PartialList extends keyof T> = Omit<T, PartialList> &
  Partial<Pick<T, PartialList>>;

/**
 * Une colonne acceptée par knex `.select(...)` : soit une clef directe de `T`,
 * soit `"table.col as alias"` où `alias` doit être une clef de `T`.
 *
 * Exemples avec `T = DossierComplet` :
 *   - `"date_dépôt"`                       ✅ clef directe
 *   - `"dossier.id as id"`                 ✅ `id` est une clef
 *   - `"déposant.nom as déposant_nom"`     ✅ `déposant_nom` est une clef
 *   - `"dossier.foo as pas_une_clef"`      ❌ l'alias n'est pas une clef
 */
export type AliasedColumn<T> = (keyof T & string) | `${string}.${string} as ${keyof T & string}`;
