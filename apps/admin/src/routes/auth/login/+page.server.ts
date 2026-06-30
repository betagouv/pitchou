import { fail, redirect } from "@sveltejs/kit";
import { dev } from "$app/environment";

import { isAdminEmail } from "@pitchou/server/admin.ts";
import { createLoginCode, verifyLoginCode } from "@pitchou/server/login-code.ts";
import { sendLoginCodeEmail } from "@pitchou/server/emails.ts";
import { createSession } from "@pitchou/server/session.ts";

import { sanitizeInternalPath } from "$lib/server/redirect.ts";
import { setSessionCookie } from "$lib/server/session.ts";

import type { Actions, PageServerLoad } from "./$types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const load: PageServerLoad = ({ url, locals }) => {
  const redirectTo = sanitizeInternalPath(url.searchParams.get("redirectTo"));

  // Already signed in: skip the wall.
  if (locals.user) {
    redirect(303, redirectTo);
  }

  return { redirectTo };
};

export const actions: Actions = {
  // Step 1: mail a code to the address, then move the form to the code step.
  requestCode: async ({ request }) => {
    const data = await request.formData();
    const email = String(data.get("email") ?? "").trim();
    const redirectTo = sanitizeInternalPath(String(data.get("redirectTo") ?? ""));

    if (!EMAIL_RE.test(email)) {
      return fail(400, { step: "email", email, redirectTo, error: "Adresse email invalide." });
    }

    // Only admins get a code; respond the same way either way so the form never
    // reveals who is on the allow-list.
    if (isAdminEmail(email)) {
      try {
        const code = await createLoginCode(email);
        if (dev) {
          // In dev, skip the email and print the code to the terminal instead.
          console.log(`[dev] login code for ${email}: ${code}`);
        } else {
          await sendLoginCodeEmail(email, code);
        }
      } catch (err) {
        console.error("Failed to send login code", err);
        return fail(502, {
          step: "email",
          email,
          redirectTo,
          error: "L'envoi de l'email a échoué. Veuillez réessayer.",
        });
      }
    }

    return { step: "code", email, redirectTo };
  },

  // Step 2: check the code and open a session.
  verifyCode: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = String(data.get("email") ?? "").trim();
    const code = String(data.get("code") ?? "").trim();
    const redirectTo = sanitizeInternalPath(String(data.get("redirectTo") ?? ""));

    if (!isAdminEmail(email) || !(await verifyLoginCode(email, code))) {
      return fail(400, {
        step: "code",
        email,
        redirectTo,
        error: "Code invalide ou expiré.",
      });
    }

    const token = await createSession({ email: email.toLowerCase(), nom: "", idToken: null });
    setSessionCookie(cookies, token);

    redirect(303, redirectTo);
  },
};
