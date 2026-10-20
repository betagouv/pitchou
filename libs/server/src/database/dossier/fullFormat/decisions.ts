import type Controle from "@pitchou/types/database/public/Controle.ts";
import type DecisionAdministrative from "@pitchou/types/database/public/DecisionAdministrative.ts";
import type Prescription from "@pitchou/types/database/public/Prescription.ts";
import type { DossierFull, FrontEndPrescription } from "@pitchou/types/API_Pitchou.ts";
import type { DecisionWithFile } from "../fullQueries.ts";
import type CapDossier from "@pitchou/types/database/public/CapDossier.ts";
import { describeFichier } from "./attachments.ts";

export function assignDecisions(
  dossier: DossierFull,
  decisions: DecisionWithFile[],
  prescriptions: Prescription[],
  controles: Controle[],
  cap: CapDossier["cap"],
) {
  const controlesByPrescription = new Map<Prescription["id"], Controle[]>();
  for (const controle of controles) {
    const values = controlesByPrescription.get(controle.prescription) || [];
    values.push(controle);
    controlesByPrescription.set(controle.prescription, values);
  }
  const prescriptionsByDecision = new Map<DecisionAdministrative["id"], FrontEndPrescription[]>();
  for (const prescription of prescriptions) {
    const frontEndPrescription = prescription as FrontEndPrescription;
    frontEndPrescription.controles = controlesByPrescription.get(prescription.id);
    const values = prescriptionsByDecision.get(prescription.decision_administrative) || [];
    values.push(frontEndPrescription);
    prescriptionsByDecision.set(prescription.decision_administrative, values);
  }
  if (decisions.length > 0) {
    dossier.decisionsAdministratives = decisions.map(
      ({
        id,
        number,
        type,
        signature_date,
        obligations_end_date,
        fichier,
        file_name,
        file_media_type,
        file_size,
        dossier: decisionDossier,
      }) => {
        const file = describeFichier(
          fichier,
          file_name,
          file_media_type,
          file_size,
          "/decision-administrative/fichier",
          cap,
        );
        return {
          id,
          number,
          type,
          signature_date,
          obligations_end_date,
          prescriptions: prescriptionsByDecision.get(id),
          fichier_url: file?.url,
          fichier_description: file,
          dossier: decisionDossier,
        };
      },
    );
  }
}
