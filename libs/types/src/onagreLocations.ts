export type ReviewedLocationCorrection = {
  id: string;
  reviewedAt: string;
  originalDepartments: string[];
  departments: string[];
  reason: string;
  scopeMatch: string;
  evidence: {
    title: string;
    url: string;
    sha256: string;
    physicalPages: number[];
    articlePage: number;
  };
};
