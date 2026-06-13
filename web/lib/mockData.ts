import type { NearestRaid } from "./queries";
import type { DungeonDTO, MemberDTO, RaidDTO } from "./dto";

/**
 * Demo/mock data shown on the landing page when `MONGODB_URI` is not configured
 * (e.g. local UI/UX demos before the data layer is wired up). Shapes mirror the
 * DTOs in `.ai/planning/06-api-contract.md`. Remove once seed data (Phase 1) lands.
 */

const NOW = () => Date.now();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const NSH_CLASSES = [
  "Thiên Sách",
  "Cái Bang",
  "Vạn Hoa",
  "Đường Môn",
  "Tàng Kiếm",
  "Thất Tú",
  "Bồng Lai",
  "Cẩm Y Vệ",
  "Ngũ Hành",
  "Tiêu Dao",
];

const MOCK_MEMBER_NAMES = [
  "LangTuVoDanh",
  "TieuLyPhi",
  "HoaVoKhuyet",
  "DocCoCauBai",
  "MaiHoaTan",
  "ThietHuyetLang",
  "VanCotKy",
  "DaKhachHanh",
  "PhongLuuTuc",
  "AmHuongCac",
  "BachVanThanh",
  "CuuUTieuYeu",
];

function mockMember(index: number): MemberDTO {
  return {
    id: `mock-member-${index}`,
    discordId: `10000000000000000${index}`,
    discordName: MOCK_MEMBER_NAMES[index % MOCK_MEMBER_NAMES.length],
    discordAvatar: `https://cdn.discordapp.com/embed/avatars/${index % 6}.png`,
    class: NSH_CLASSES[index % NSH_CLASSES.length],
    classIcon: null,
    isActive: true,
    syncedAt: new Date(NOW()).toISOString(),
  };
}

function mockRaid(opts: {
  id: string;
  dungeonId: string;
  size: 6 | 12;
  startInMs: number;
  title: string | null;
  filledSlots: number;
  memberOffset: number;
}): { raid: RaidDTO; members: Record<string, MemberDTO> } {
  const members: Record<string, MemberDTO> = {};

  const slots = Array.from({ length: opts.size }, (_, index) => {
    if (index >= opts.filledSlots) {
      return { index, roleLabel: null, memberId: null };
    }
    const member = mockMember(opts.memberOffset + index);
    members[member.id] = member;
    return { index, roleLabel: null, memberId: member.id };
  });

  const raid: RaidDTO = {
    id: opts.id,
    dungeonId: opts.dungeonId,
    size: opts.size,
    startAt: new Date(NOW() + opts.startInMs).toISOString(),
    title: opts.title,
    notes: null,
    slots,
    status: "scheduled",
  };

  return { raid, members };
}

/** Demo stats for `TeamIntro` when no database is configured. */
export const MOCK_TEAM_STATS = [
  { label: "Thành viên", value: "42" },
  { label: "Phụ bản đã chinh phục", value: "118" },
  { label: "Raid mỗi tuần", value: "5" },
];

export function getMockNearestRaids(): NearestRaid[] {
  const dungeon6: DungeonDTO = {
    id: "mock-dungeon-6",
    name: "Ác Nhân Cốc — Quỷ Diện Đường",
    size: 6,
    description: "Phụ bản 6 người — đột kích sào huyệt Quỷ Diện Đường, cẩn trọng cơ quan.",
    imageKey: null,
    isActive: true,
  };

  const dungeon12: DungeonDTO = {
    id: "mock-dungeon-12",
    name: "Tống Kim Chiến Trường",
    size: 12,
    description: "Phụ bản 12 người — đại chiến Tống Kim, phối hợp toàn đội để hạ Boss cuối.",
    imageKey: null,
    isActive: true,
  };

  const raid6 = mockRaid({
    id: "mock-raid-6",
    dungeonId: dungeon6.id,
    size: 6,
    startInMs: DAY + 19 * HOUR,
    title: null,
    filledSlots: 5,
    memberOffset: 0,
  });

  const raid12 = mockRaid({
    id: "mock-raid-12",
    dungeonId: dungeon12.id,
    size: 12,
    startInMs: 3 * DAY + 4 * HOUR,
    title: "Đại chiến Tống Kim — Tối thứ 7",
    filledSlots: 9,
    memberOffset: 5,
  });

  return [
    { raid: raid6.raid, dungeon: dungeon6, members: raid6.members },
    { raid: raid12.raid, dungeon: dungeon12, members: raid12.members },
  ];
}
