import type { UserId } from "./permissions.ts";

export type GroupMember = {
  id: UserId;
  email: string | null;
  first_names: string | null;
  last_name: string | null;
  active: boolean;
};

export type MembershipGroup = {
  id: string;
  name: string;
  members: GroupMember[];
};

export type GroupMemberCandidate = Pick<GroupMember, "id" | "first_names" | "last_name"> & {
  email: string;
};
