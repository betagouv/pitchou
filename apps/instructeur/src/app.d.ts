// See https://svelte.dev/docs/kit/types#app
declare global {
  interface Window {
    dsfr(element: HTMLElement): { modal: { conceal(): void } };
  }
  namespace App {
    // interface Error {}
    interface Locals {
      cap?: string;
      secret?: string;
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
