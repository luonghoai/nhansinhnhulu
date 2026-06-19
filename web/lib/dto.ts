import type { HydratedDocument } from "mongoose";
import type { MemberDoc } from "./models/Member";
import type { DungeonDoc } from "./models/Dungeon";
import type { RaidDoc, SlotDoc } from "./models/Raid";
import type { JoinRequestDoc } from "./models/JoinRequest";

// Shapes mirror the DTOs in `.ai/planning/06-api-contract.md`.

export type MemberDTO = {
  id: string;
  discordId: string;
  discordName: string;
  discordAvatar: string;
  class: string | null;
  classIcon: string | null;
  isActive: boolean;
  syncedAt: string;
};

export type DungeonDTO = {
  id: string;
  name: string;
  size: 6 | 12;
  description?: string;
  imageKey?: string | null;
  isActive: boolean;
};

export type SlotDTO = {
  index: number;
  roleLabel: string | null;
  memberId: string | null;
};

export type RaidDTO = {
  id: string;
  dungeonId: string;
  size: 6 | 12;
  startAt: string;
  title?: string | null;
  notes?: string | null;
  slots: SlotDTO[];
  status: "scheduled" | "completed" | "cancelled";
  announcedAt?: string | null;
};

export type JoinRequestDTO = {
  id: string;
  raidId: string;
  memberId: string;
  discordId: string;
  status: "pending" | "approved" | "rejected";
  requestedSlotIndex?: number | null;
  decidedBy?: string | null;
  decidedAt?: string | null;
  notifiedAt?: string | null;
};

export function toMemberDTO(doc: HydratedDocument<MemberDoc>): MemberDTO {
  return {
    id: doc._id.toString(),
    discordId: doc.discordId,
    discordName: doc.discordName,
    discordAvatar: doc.discordAvatar,
    class: doc.class ?? null,
    classIcon: doc.classIcon ?? null,
    isActive: doc.isActive ?? true,
    syncedAt: (doc.syncedAt ?? new Date()).toISOString(),
  };
}

export function toDungeonDTO(doc: HydratedDocument<DungeonDoc>): DungeonDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    size: doc.size as 6 | 12,
    description: doc.description ?? "",
    imageKey: doc.imageKey ?? null,
    isActive: doc.isActive ?? true,
  };
}

function toSlotDTO(slot: SlotDoc): SlotDTO {
  return {
    index: slot.index,
    roleLabel: slot.roleLabel ?? null,
    memberId: slot.memberId ? slot.memberId.toString() : null,
  };
}

export function toRaidDTO(doc: HydratedDocument<RaidDoc>): RaidDTO {
  return {
    id: doc._id.toString(),
    dungeonId: doc.dungeonId.toString(),
    size: doc.size as 6 | 12,
    startAt: doc.startAt.toISOString(),
    title: doc.title ?? null,
    notes: doc.notes ?? null,
    slots: (doc.slots ?? []).map(toSlotDTO),
    status: doc.status as RaidDTO["status"],
    announcedAt: doc.announcedAt ? doc.announcedAt.toISOString() : null,
  };
}

export type RaidWithDungeonDTO = RaidDTO & { dungeon: DungeonDTO };

export function toJoinRequestDTO(doc: HydratedDocument<JoinRequestDoc>): JoinRequestDTO {
  return {
    id: doc._id.toString(),
    raidId: doc.raidId.toString(),
    memberId: doc.memberId.toString(),
    discordId: doc.discordId,
    status: doc.status as JoinRequestDTO["status"],
    requestedSlotIndex: doc.requestedSlotIndex ?? null,
    decidedBy: doc.decidedBy ?? null,
    decidedAt: doc.decidedAt ? doc.decidedAt.toISOString() : null,
    notifiedAt: doc.notifiedAt ? doc.notifiedAt.toISOString() : null,
  };
}
