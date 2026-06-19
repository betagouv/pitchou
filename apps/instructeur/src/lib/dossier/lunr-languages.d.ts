// lunr-languages ne fournit pas de types. Ses points d'entrée utilisés ici sont des
// fonctions qui reçoivent l'instance lunr pour enregistrer le support de langue.
declare module "lunr-languages/lunr.stemmer.support" {
  const registerStemmerSupport: (lunr: typeof import("lunr").default) => void;
  export default registerStemmerSupport;
}
declare module "lunr-languages/lunr.fr" {
  const registerFrenchLanguage: (lunr: typeof import("lunr").default) => void;
  export default registerFrenchLanguage;
}
