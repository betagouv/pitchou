import { afterEach, beforeEach, expect, it, vi } from "vitest";
import debounce from "./debounce.ts";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it("saves the latest value only after typing stops", () => {
  const callback = vi.fn();
  const save = debounce(callback, 1000);
  save("first");
  vi.advanceTimersByTime(900);
  save("last");
  vi.advanceTimersByTime(999);
  expect(callback).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(callback).toHaveBeenCalledExactlyOnceWith("last");
});

it("flushes a pending search once when the page becomes hidden", () => {
  const callback = vi.fn();
  const search = debounce(callback, 10000);
  search("renard");
  search.flush();
  search.flush();
  vi.runAllTimers();
  expect(callback).toHaveBeenCalledExactlyOnceWith("renard");
});

it("records an immediate visit once, then allows another after the delay", () => {
  const callback = vi.fn();
  const visit = debounce(callback, 1000, true);
  visit("first");
  expect(callback).toHaveBeenCalledExactlyOnceWith("first");
  vi.advanceTimersByTime(1000);
  expect(callback).toHaveBeenCalledTimes(1);
  visit("second");
  expect(callback).toHaveBeenLastCalledWith("second");
});

it("preserves a trailing visit after repeated calls in immediate mode", () => {
  const callback = vi.fn();
  const visit = debounce(callback, 1000, true);
  visit("first");
  vi.advanceTimersByTime(500);
  visit("second");
  vi.advanceTimersByTime(1000);
  expect(callback.mock.calls).toEqual([["first"], ["second"]]);
});

it("cancels pending work", () => {
  const callback = vi.fn();
  const save = debounce(callback, 1000);
  save();
  save.cancel();
  save.flush();
  vi.runAllTimers();
  expect(callback).not.toHaveBeenCalled();
});
