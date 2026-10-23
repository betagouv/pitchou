import { expect, test, vi } from "vitest";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { dispatch, setup } from "./fixtures.ts";

const rejected = (status: number) => ({ response: new Response(null, { status }) });
const minutesAfter = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60_000);

test.each([429, 401])(
  "a later HTTP %i cannot erase an earlier ambiguous acceptance",
  async (status) => {
    const { action, recipient } = await setup();
    await action("avis_modifie");
    const [row] = await db("email_notification_outbox");
    const send = vi
      .fn()
      .mockRejectedValueOnce(new Error("Accepted but response lost"))
      .mockRejectedValueOnce(rejected(status))
      .mockResolvedValue({ messageId: "must-not-send" });
    await dispatch(row.due_at, send);
    await dispatch(minutesAfter(row.due_at, 10), send);
    const afterRejection = await db("email_notification_outbox").where({ id: row.id }).first();
    await Promise.all([
      dispatch(minutesAfter(row.due_at, 40), send),
      dispatch(minutesAfter(row.due_at, 40), send),
    ]);
    await dispatch(minutesAfter(row.due_at, 50), send);
    expect(send).toHaveBeenCalledTimes(2);
    expect(afterRejection.first_attempt_at).toEqual(row.due_at);
    expect(send.mock.calls[0][0]).toEqual(send.mock.calls[1][0]);
    expect(await db("email_notification_outbox").where({ id: row.id }).first()).toMatchObject({
      status: "uncertain",
      first_attempt_at: row.due_at,
      attempt_count: 2,
      provider_message_id: null,
      last_error: "deduplication_window_expired",
      claimed_at: null,
    });
    const history = await db("email_notification_history")
      .where({ notification_id: row.id })
      .orderBy("occurred_at");
    expect(history.map((event) => event.event)).toEqual([
      "queued",
      "attempted",
      "failed",
      "attempted",
      "failed",
      "uncertain",
    ]);
    const metrics = await db("evenement_metrique").whereRaw("details->>'notificationId' = ?", [
      row.id,
    ]);
    expect(metrics.filter((event) => event.evenement === "notificationEmailSent")).toHaveLength(0);
    const uncertain = metrics.filter((event) => event.evenement === "notificationEmailUncertain");
    expect(uncertain).toHaveLength(1);
    expect(uncertain[0]).toMatchObject({
      personne: recipient.id,
      details: {
        notificationId: row.id,
        attempt: 2,
        errorCategory: "deduplication_window_expired",
        environment: "test",
        source: "system",
        attribution: "recipient",
      },
    });
  },
);

test.each([429, 401])(
  "only explicit HTTP %i rejections allow prolonged retries",
  async (status) => {
    const { action } = await setup();
    await action("avis_modifie");
    const [row] = await db("email_notification_outbox");
    const send = vi
      .fn()
      .mockRejectedValueOnce(rejected(status))
      .mockRejectedValueOnce(rejected(status))
      .mockResolvedValue({ messageId: "accepted-later" });
    await dispatch(row.due_at, send);
    await dispatch(minutesAfter(row.due_at, 40), send);
    expect((await db("email_notification_outbox").first()).first_attempt_at).toBeNull();
    await dispatch(minutesAfter(row.due_at, 1440), send);
    expect(send).toHaveBeenCalledTimes(3);
    expect(send.mock.calls[0][0]).toEqual(send.mock.calls[2][0]);
    expect(await db("email_notification_outbox").first()).toMatchObject({
      status: "sent",
      attempt_count: 3,
      provider_message_id: "accepted-later",
    });
  },
);

test("an expired lease and its late rejection preserve the original acceptance boundary", async () => {
  const { action } = await setup();
  await action("avis_modifie");
  const [row] = await db("email_notification_outbox");
  let rejectFirst!: (error: unknown) => void;
  let started!: () => void;
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  const send = vi
    .fn()
    .mockImplementationOnce(() => {
      started();
      return new Promise((_resolve, reject) => {
        rejectFirst = reject;
      });
    })
    .mockRejectedValueOnce(rejected(429))
    .mockResolvedValue({ messageId: "must-not-send" });
  const first = dispatch(row.due_at, send);
  await ready;
  try {
    await dispatch(minutesAfter(row.due_at, 3), send);
  } finally {
    rejectFirst(rejected(401));
    await first;
  }
  await dispatch(minutesAfter(row.due_at, 40), send);
  expect(send).toHaveBeenCalledTimes(2);
  expect(send.mock.calls[0][0]).toEqual(send.mock.calls[1][0]);
  expect(await db("email_notification_outbox").first()).toMatchObject({
    status: "uncertain",
    first_attempt_at: row.due_at,
    attempt_count: 2,
  });
  const history = await db("email_notification_history").where({ notification_id: row.id });
  expect(history.filter((event) => event.event === "failed")).toHaveLength(1);
  expect(history.filter((event) => event.event === "uncertain")).toHaveLength(1);
});
