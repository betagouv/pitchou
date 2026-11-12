import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  summary: vi.fn(),
  questions: vi.fn(),
  texts: vi.fn(),
  duplicates: vi.fn(),
  confirmed: vi.fn(),
}));
vi.mock("@pitchou/server/database.ts", () => ({ directDatabaseConnection: {} }));
vi.mock("@pitchou/server/onagre/reviewSummary.ts", () => ({ loadReviewSummary: mocks.summary }));
vi.mock("@pitchou/server/onagre/questions.ts", async (original) => ({
  ...(await original<object>()),
  loadQuestions: mocks.questions,
}));
vi.mock("@pitchou/server/onagre/comments.ts", async (original) => ({
  ...(await original<object>()),
  loadCommentWorkspace: mocks.texts,
}));
vi.mock("@pitchou/server/onagre/duplicates.ts", async (original) => ({
  ...(await original<object>()),
  loadDuplicateWorkspace: mocks.duplicates,
}));
vi.mock("@pitchou/server/onagre/confirmedDuplicates.ts", async (original) => ({
  ...(await original<object>()),
  loadConfirmedDuplicates: mocks.confirmed,
}));
import { load } from "./+page.server.ts";
const event = (query = "") => ({ url: new URL(`http://admin.test/onagre${query}`) }) as never;
beforeEach(() => {
  vi.resetAllMocks();
  mocks.summary.mockResolvedValue({});
  mocks.questions.mockResolvedValue([]);
});

test.each([
  "dump",
  "correspondances",
  "services",
  "activites",
  "regles",
  "import",
  "historique",
  "dossiers",
  "synthese",
])("old %s links retain their context when moved to Tech", async (tab) => {
  await expect(load(event(`?tab=${tab}&snapshot=17&row=42&search=AB`))).rejects.toMatchObject({
    status: 303,
    location: `/tech/onagre?tab=${tab}&snapshot=17&row=42&search=AB`,
  });
  expect(mocks.summary).not.toHaveBeenCalled();
});
test("the review landing does not fetch questions or detailed review datasets", async () => {
  await load(event());
  expect(mocks.questions).not.toHaveBeenCalled();
  for (const fn of [mocks.texts, mocks.duplicates, mocks.confirmed])
    expect(fn).not.toHaveBeenCalled();
});
test("confirmed duplicate deep links still open the readonly review dataset", async () => {
  await load(event("?tab=doublons-evites"));
  expect(mocks.confirmed).toHaveBeenCalledOnce();
  expect(mocks.duplicates).not.toHaveBeenCalled();
});
