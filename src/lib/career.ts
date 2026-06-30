// Career profile query (NASCAR-012). Aggregates a player's results across all
// their leagues. One grouped fetch of COMPLETED, non-AI result rows feeds both
// the pure stats roll-up (src/lib/stats.ts) and the recent-results list. Stats
// update automatically as results are entered (NASCAR-061) — no sync job.

import { RaceStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import {
  computeCareerStats,
  type CareerRow,
  type CareerStats,
} from "@/lib/stats";

const RECENT_LIMIT = 10;

export type RecentResult = {
  raceId: string;
  leagueId: string;
  leagueName: string;
  round: number;
  trackName: string;
  series: string;
  finishPos: number;
  points: number;
  completedAt: Date | null;
};

export type CareerProfile = {
  userId: string;
  displayName: string;
  stats: CareerStats;
  recent: RecentResult[];
};

/**
 * A player's career profile, or null if the user doesn't exist. AI entries are
 * excluded (they carry no userId). Both `/profile` (self) and `/profile/[userId]`
 * (public, read-only) render the same shape.
 */
export async function getCareerProfile(
  userId: string,
): Promise<CareerProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, displayName: true },
  });
  if (!user) return null;

  const participants = await prisma.raceParticipant.findMany({
    where: {
      userId,
      isAi: false,
      race: { status: RaceStatus.COMPLETED },
      result: { isNot: null },
    },
    select: {
      result: { select: { finishPos: true, startPos: true, points: true } },
      race: {
        select: {
          id: true,
          round: true,
          completedAt: true,
          leagueId: true,
          track: { select: { name: true } },
          league: { select: { name: true, series: true } },
        },
      },
    },
  });

  // result is nullable in the type even though the query filters it non-null.
  const scored = participants.filter((p) => p.result !== null);

  const rows: CareerRow[] = scored.map((p) => ({
    leagueId: p.race.leagueId,
    leagueName: p.race.league.name,
    series: p.race.league.series,
    finishPos: p.result!.finishPos,
    startPos: p.result!.startPos,
    points: p.result!.points,
  }));

  const recent: RecentResult[] = scored
    .map((p) => ({
      raceId: p.race.id,
      leagueId: p.race.leagueId,
      leagueName: p.race.league.name,
      round: p.race.round,
      trackName: p.race.track.name,
      series: p.race.league.series,
      finishPos: p.result!.finishPos,
      points: p.result!.points,
      completedAt: p.race.completedAt,
    }))
    .sort(
      (a, b) =>
        (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0),
    )
    .slice(0, RECENT_LIMIT);

  return {
    userId: user.id,
    displayName: user.displayName?.trim() || "Driver",
    stats: computeCareerStats(rows),
    recent,
  };
}
