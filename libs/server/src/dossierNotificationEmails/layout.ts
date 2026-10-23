function escapeText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeHtml(value: string): string {
  return escapeText(value).replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

export function notificationEmailHtml({
  title,
  introduction,
  label,
  dossierUrl,
  settingsUrl,
  logoUrl,
}: {
  title: string;
  introduction: string;
  label: string;
  dossierUrl: string;
  settingsUrl: string;
  logoUrl: string;
}) {
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)} - Pitchou</title></head>
<body style="margin:0;padding:0;background-color:#f6f6fe;color:#161616;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f6f6fe">
    <tr><td align="center" style="padding:32px 12px;">
      <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width:600px;border:1px solid #dddddd;border-top:4px solid #6b75d3;border-radius:8px;">
        <tr><td style="padding:24px;border-bottom:1px solid #eeeeee;">
          <img src="${escapeHtml(logoUrl)}" alt="Pitchou" width="209" height="40" style="display:block;width:209px;max-width:100%;height:auto;border:0;color:#252e7e;font-size:24px;font-weight:bold;">
        </td></tr>
        <tr><td style="padding:28px 24px 32px;">
          <h1 style="margin:0 0 24px;color:#252e7e;font-size:24px;line-height:32px;font-weight:700;">${escapeHtml(title)}</h1>
          <p style="margin:0 0 16px;font-size:16px;line-height:26px;">Bonjour,</p>
          <p style="margin:0 0 24px;font-size:16px;line-height:26px;">${escapeText(introduction)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td bgcolor="#ececfe" style="border-left:4px solid #6b75d3;">
              <a href="${escapeHtml(dossierUrl)}" style="display:block;padding:20px;color:#000091;font-size:17px;line-height:26px;font-weight:700;text-decoration:underline;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(label)}</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 24px;border-top:1px solid #eeeeee;">
          <p style="margin:0;color:#666666;font-size:14px;line-height:22px;"><em>Vous pouvez <a href="${escapeHtml(settingsUrl)}" style="color:#666666;text-decoration:underline;">paramétrer les mails de notifications automatiques dans votre espace</a>.</em></p>
        </td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>
  </table>
</body></html>`;
}
