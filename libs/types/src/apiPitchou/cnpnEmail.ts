import type Dossier from "../database/public/Dossier.ts";
import type File from "../database/public/File.ts";

export type SendCnpnEmailRequest = {
  requestId: string;
  recipient?: string;
  subject: string;
  htmlBody: string;
  cc: string[];
  attachmentIds: File["id"][];
};

export type DossierCnpnEmailSentEvent = {
  id: string;
  dossier: Dossier["id"];
  sent_by_email: string | null;
  sent_at: Date | string;
  delivered_at: Date | string | null;
  opened_at: Date | string | null;
  recipient_email: string;
  cc_emails: string[];
  subject: string;
  attachment_ids: File["id"][];
  attachment_names: string[];
};
