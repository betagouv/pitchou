// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      user: { email: string; name: string } | null;
    }
    interface PageData {
      user?: { email: string; name: string } | null;
    }
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
