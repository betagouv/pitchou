// lunr-languages does not provide types. The entry points used here are
// functions that receive the lunr instance to register language support.
declare module "lunr-languages/lunr.stemmer.support" {
  const registerStemmerSupport: (lunr: typeof import("lunr").default) => void;
  export default registerStemmerSupport;
}
declare module "lunr-languages/lunr.fr" {
  const registerFrenchLanguage: (lunr: typeof import("lunr").default) => void;
  export default registerFrenchLanguage;
}
