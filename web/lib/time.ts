import { endOfWeek, startOfWeek } from "date-fns";
import { fromZonedTime, toZonedTime, formatInTimeZone } from "date-fns-tz";

/** Team timezone for rendering and week-boundary math. All storage stays UTC. */
export const TEAM_TIMEZONE = process.env.TEAM_TIMEZONE || "Asia/Ho_Chi_Minh";

/**
 * Returns the UTC instants for the start (Mon 00:00) and end (Sun 23:59:59.999)
 * of the team-timezone week containing `reference` (defaults to now).
 */
export function getWeekRangeUtc(reference: Date = new Date()): { start: Date; end: Date } {
  const zoned = toZonedTime(reference, TEAM_TIMEZONE);
  const zonedStart = startOfWeek(zoned, { weekStartsOn: 1 });
  const zonedEnd = endOfWeek(zoned, { weekStartsOn: 1 });

  return {
    start: fromZonedTime(zonedStart, TEAM_TIMEZONE),
    end: fromZonedTime(zonedEnd, TEAM_TIMEZONE),
  };
}

/** Formats a UTC date in the team timezone, e.g. "Mon 14/06 20:00". */
export function formatInTeamTimezone(date: Date, formatStr = "EEE dd/MM HH:mm"): string {
  return formatInTimeZone(date, TEAM_TIMEZONE, formatStr);
}
