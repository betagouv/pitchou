import type { SessionUser } from "@pitchou/types/permissions.ts";
declare global {
  const __PITCHOU_ORIGIN__: string | null;
  namespace App {
    interface Locals {
      user: SessionUser | null;
    }
    interface PageData {
      user?: SessionUser | null;
      isAdmin?: boolean;
    }
  }
}
export {};
