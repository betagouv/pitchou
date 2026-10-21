import { expect, test } from "vitest";
import { avatarClass } from "./commentaires.ts";

test("uses the entire supplementary character to select the avatar colour", () => {
  expect(avatarClass("🐦@example.org")).toBe("bg-[#FEE7FC] text-[#A558A0]");
});

test("keeps the same avatar colour for the same author name", () => {
  expect(avatarClass("alice@example.org")).toBe("bg-[#FDDBCB] text-[#B34000]");
  expect(avatarClass("alice@other.example")).toBe(avatarClass("alice@example.org"));
});
