import { isValidDate } from "@pitchou/common/typeFormat.ts";
import type Controle from "@pitchou/types/database/public/Controle.ts";
import type { ResultatControle, TypesActionSuiteControle } from "@pitchou/types/API_Pitchou.ts";

export function parseControles(row: Record<string, any>): Omit<Controle, "id" | "prescription">[] {
  const controles: Omit<Controle, "id" | "prescription">[] = [];
  let controleNumber = 1;

  while (true) {
    const controleDateProperty = `${controleNumber} Date contrôle`;
    const resultProperty = `${controleNumber} Résultat contrôle`;
    const commentProperty = `${controleNumber} Commentaire`;
    const postControleActionTypeProperty = `${controleNumber} Type de Suite`;
    const postControleActionDateProperty = `${controleNumber} Date de la suite`;
    const nextDueDateProperty = `${controleNumber} Date Echéance`;

    const controleDate = row[controleDateProperty];
    let result: ResultatControle = row[resultProperty];
    if (result && result.trim() === "non conforme") {
      result = "Non conforme";
    }
    if (result && result.trim() === "conforme") {
      result = "Conforme";
    }
    if (result && result.trim() === "en cours") {
      result = "En cours";
    }
    if (result && result.trim() === "trop tard") {
      result = "Trop tard";
    }

    const comment = row[commentProperty];

    let postControleActionType: TypesActionSuiteControle = row[postControleActionTypeProperty];

    if (postControleActionType && postControleActionType.trim() === "mail") {
      postControleActionType = "Email";
    }
    if (postControleActionType && postControleActionType.trim() === "courrier") {
      postControleActionType = "Courrier";
    }

    const postControleActionDate = row[postControleActionDateProperty];
    const nextDueDate = row[nextDueDateProperty];

    if (controleDate && result) {
      controles.push({
        controle_date: isValidDate(new Date(controleDate)) ? new Date(controleDate) : null,
        result,
        comment,
        post_controle_action_type: postControleActionType,
        post_controle_action_date: isValidDate(new Date(postControleActionDate))
          ? new Date(postControleActionDate)
          : null,
        next_due_date: isValidDate(new Date(nextDueDate)) ? new Date(nextDueDate) : null,
      });

      controleNumber = controleNumber + 1;
    } else {
      break;
    }
  }

  return controles;
}
