import ky from "ky";

// keep in sync with https://app.brevo.com/templates/listing
const CONNEXION_EMAIL_TEMPLATE_ID = 1;

const BREVO_EMAIL_SEND_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export async function envoyerEmailConnexion(email: string, lienConnexion: string): Promise<any> {
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
        templateId: CONNEXION_EMAIL_TEMPLATE_ID,
        to: [{ email }],
        params: {
          lien_connexion: lienConnexion,
        },
      },
    })
    .json();
}

// Inline body (no Brevo template) keeps this self-contained; the sender address
// comes from BREVO_SENDER_EMAIL.
export async function sendLoginCodeEmail(email: string, code: string): Promise<any> {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) {
    throw new Error("Missing BREVO_API_KEY environment variable");
  }
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!senderEmail) {
    throw new Error("Missing BREVO_SENDER_EMAIL environment variable");
  }
  const htmlContent = `<!doctype html>
<html lang="fr">
  <body style="font-family: system-ui, sans-serif; color: #161616;">
    <p>Bonjour,</p>
    <p>Voici votre code de connexion&nbsp;:</p>
    <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px;">${code}</p>
    <p>Ce code est valable 10&nbsp;minutes. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
  </body>
</html>`;
  return ky
    .post(BREVO_EMAIL_SEND_ENDPOINT, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": BREVO_API_KEY,
      },
      json: {
        sender: { email: senderEmail, name: "Pitchou" },
        to: [{ email }],
        subject: "Votre code de connexion Pitchou",
        htmlContent,
      },
    })
    .json();
}
