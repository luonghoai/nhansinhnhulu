import type { Model } from "mongoose";
import type { MemberDoc } from "./models/Member";
import { ARENA_TEAM_SIZE } from "./models/ArenaTeam";

type SubmittedSlot = {
  index: number;
  roleLabel?: string | null;
  memberId?: string | null;
};

export type ResolvedSlot = {
  index: number;
  roleLabel: string | null;
  memberId: string | null;
};

/**
 * Builds a full, fixed-length ({@link ARENA_TEAM_SIZE}) slot array from a partial
 * submission. Validates that indices are in range, no member is rostered twice, and
 * every referenced member exists. Returns `{ error }` (caller maps to 400) on failure.
 */
export async function resolveArenaSlots(
  submitted: SubmittedSlot[],
  MemberModel: Model<MemberDoc>
): Promise<{ slots: ResolvedSlot[] } | { error: string }> {
  const slots: ResolvedSlot[] = Array.from({ length: ARENA_TEAM_SIZE }, (_, index) => ({
    index,
    roleLabel: null,
    memberId: null,
  }));

  const assignedMemberIds = new Set<string>();
  for (const slot of submitted) {
    if (slot.index < 0 || slot.index >= ARENA_TEAM_SIZE) {
      return { error: `Slot index out of range: ${slot.index}` };
    }
    if (slot.memberId) {
      if (assignedMemberIds.has(slot.memberId)) {
        return { error: "A member can only be assigned to one slot" };
      }
      assignedMemberIds.add(slot.memberId);
    }
    slots[slot.index] = {
      index: slot.index,
      roleLabel: slot.roleLabel ?? null,
      memberId: slot.memberId ?? null,
    };
  }

  if (assignedMemberIds.size > 0) {
    const found = await MemberModel.find({ _id: { $in: [...assignedMemberIds] } }).select("_id");
    if (found.length !== assignedMemberIds.size) {
      return { error: "One or more members not found" };
    }
  }

  return { slots };
}
