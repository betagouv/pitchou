import ky from "ky";

// keep in sync with https://app.brevo.com/templates/listing
const LOGIN_EMAIL_TEMPLATE_ID = 1;

const BREVO_EMAIL_SEND_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export async function sendLoginEmail(email: string, loginLink: string): Promise<any> {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) {
    throw new Error("Missing BREVO_API_KEY environment variable");
  }
  return ky
    .post(BREVO_EMAIL_SEND_ENDPOINT, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": BREVO_API_KEY,
      },
      json: {
        templateId: LOGIN_EMAIL_TEMPLATE_ID,
        to: [{ email }],
        params: {
          lien_connexion: loginLink,
        },
      },
    })
    .json();
}
