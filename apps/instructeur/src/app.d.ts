import type { SessionUser } from "@pitchou/types/permissions.ts";
declare global {
  namespace App {
    interface Locals {
      user: SessionUser | null;
    }
  }
}
export {};
