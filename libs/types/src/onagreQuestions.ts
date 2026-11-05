export const questionStatusLabels = {
  open: "À discuter",
  answered: "Décision prise",
  deferred: "Reportée",
} as const;

export type OnagreQuestionStatus = keyof typeof questionStatusLabels;

export type OnagreQuestion = {
  id: string;
  title: string;
  context: string;
  examples: string;
  options: string;
  answer: string;
  status: OnagreQuestionStatus;
  version: number;
  created_at: Date | string;
  updated_at: Date | string;
};

export type OnagreQuestionInput = Pick<
  OnagreQuestion,
  "id" | "title" | "context" | "examples" | "options" | "answer" | "status" | "version"
>;
