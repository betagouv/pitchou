import { error } from "@sveltejs/kit";
export function GET() {
  error(410, "Connectez-vous avec ProConnect.");
}
export const POST = GET;
