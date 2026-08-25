import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

/** Bureau des dérogations espèces protégées (ET4/DEB/DGALN). */
export const DEFAULT_MAIL_RECIPIENT =
  "derogations-especes-protegees.et4.deb.dgaln@developpement-durable.gouv.fr";

/**
 * Windows hands a mailto: URL to the mail client through the command line, which truncates
 * around 2000 characters. Stay under it with a margin so the recipient and the subject always
 * survive, and put the body in the clipboard instead when it does not fit.
 *
 * This budget is spent on the ENCODED URL, not on the characters typed: percent-encoding
 * inflates French prose by roughly 1.6×, since every space costs 3 characters ("%20"), every
 * line break 3 ("%0A"), and every accented letter 6 ("é" is two UTF-8 bytes, so "%C3%A9").
 * A 1 100-character mail is already at the ceiling.
 */
export const MAILTO_URL_MAX_LENGTH = 1800;

export type MailDraft = {
  recipient: string;
  subject: string;
  body: string;
};

/** RFC 6068 writes the address as a plain addr-spec, so the "@" stays readable. */
function encodeRecipient(recipient: string): string {
  return encodeURIComponent(recipient).replaceAll("%40", "@");
}

export function buildMailtoUrl({ recipient, subject, body }: MailDraft): string {
  const parameters = new URLSearchParams({ subject, body });
  // URLSearchParams encodes spaces as "+", which mail clients show literally in the body.
  return `mailto:${encodeRecipient(recipient)}?${parameters.toString().replaceAll("+", "%20")}`;
}

/**
 * How much of the mailto: budget a draft uses, so the modal can explain a refusal with the
 * real figures rather than an unexplained "too long".
 */
export function measureMailtoUrl(draft: MailDraft): {
  typed: number;
  encoded: number;
  limit: number;
  fits: boolean;
} {
  const encoded = buildMailtoUrl(draft).length;
  return {
    typed: draft.body.length,
    encoded,
    limit: MAILTO_URL_MAX_LENGTH,
    fits: encoded <= MAILTO_URL_MAX_LENGTH,
  };
}

/**
 * Whether the body can travel inside the mailto: URL. When it cannot, the caller sends the
 * mail without a body and copies the text to the clipboard so nothing is silently cut off.
 */
export function bodyFitsInMailtoUrl(draft: MailDraft): boolean {
  return measureMailtoUrl(draft).fits;
}

/** An explicit subject line, as mail templates write it: "Objet : Saisine du CNPN". */
const EXPLICIT_SUBJECT_LINE = /^\s*objet\s*[:\-–—]\s*(\S.*?)\s*$/i;

/** How far into the document an explicit "Objet :" line is still meant as the subject. */
const EXPLICIT_SUBJECT_SEARCH_LINES = 5;

/** Beyond this, a first line is a paragraph rather than a subject, so it stays in the body. */
const MAX_SUBJECT_LENGTH = 200;

/**
 * Mail templates open with their subject, either as an explicit "Objet : …" line or as a bare
 * first line. Pull it out so it lands in the mail's subject field instead of being repeated at
 * the top of the body. Returns an empty subject when the document has no usable first line,
 * which tells the caller to fall back to {@link defaultMailSubject}.
 */
export function splitSubjectAndBody(documentText: string): { subject: string; body: string } {
  const lines = documentText.split("\n");
  const firstFilledIndex = lines.findIndex((line) => line.trim() !== "");
  if (firstFilledIndex === -1) return { subject: "", body: documentText };

  const explicitIndex = lines.findIndex(
    (line, index) =>
      index < firstFilledIndex + EXPLICIT_SUBJECT_SEARCH_LINES && EXPLICIT_SUBJECT_LINE.test(line),
  );

  const subjectIndex = explicitIndex === -1 ? firstFilledIndex : explicitIndex;
  const subjectLine = lines[subjectIndex];
  const subject = (subjectLine.match(EXPLICIT_SUBJECT_LINE)?.[1] ?? subjectLine).trim();

  if (subject.length > MAX_SUBJECT_LENGTH) return { subject: "", body: documentText };

  const remaining = lines.toSpliced(subjectIndex, 1);
  // Taking the line out of the middle leaves the blank lines that framed it back to back.
  if (remaining[subjectIndex - 1]?.trim() === "" && remaining[subjectIndex]?.trim() === "") {
    remaining.splice(subjectIndex, 1);
  }
  // Drop the blank lines the subject used to be separated from, so the body starts on its text.
  while (remaining.length > 0 && remaining[0].trim() === "") remaining.shift();

  return { subject, body: remaining.join("\n") };
}

/**
 * Hand the draft over to the user's mail client. Clicking a mailto: link lets the browser pass
 * it to the OS without unloading the page, which assigning `location.href` would risk.
 */
export function openMailClient(mailtoUrl: string): void {
  const link = document.createElement("a");
  link.href = mailtoUrl;
  document.body.append(link);
  link.click();
  link.remove();
}

export function defaultMailSubject(dossier: DossierFull, documentName: string): string {
  const documentLabel = documentName.replace(/\.odt$/i, "").replace(/-\d{4}-\d{2}-\d{2}T.*$/, "");
  const dossierLabel = dossier.name || dossier.demarche_numerique_number;
  return dossierLabel ? `${documentLabel} - ${dossierLabel}` : documentLabel;
}
