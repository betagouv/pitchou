// See https://svelte.dev/docs/kit/types#app
declare global {
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
