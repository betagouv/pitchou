import { reviewedLocation } from "@pitchou/common/onagre/reviewedLocations.ts";
import type { DuplicateReview } from "@pitchou/types/onagreDuplicates.ts";

export function withReviewedLocations(project: DuplicateReview): DuplicateReview {
  return {
    ...project,
    payload: {
      ...project.payload,
      demandes: project.payload.demandes.map((demande) => {
        const locationCorrection = reviewedLocation({
          ...demande,
          projectId: project.project_id,
          sourceHash: project.payload.sourceHash,
          sourceKind: "project",
        });
        return locationCorrection
          ? { ...demande, departments: locationCorrection.departments, locationCorrection }
          : demande;
      }),
    },
  };
}
