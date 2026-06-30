// Career stats aggregation (NASCAR-012). Pure and free of any `@/` value import,
// so it unit-tests under the bare node runner. The query layer (src/lib/career.ts)
// fetches a player's COMPLETED, human (non-AI) result rows and feeds them here;
// this module rolls them up into career totals and per-league / per-series splits.

/** One human finish in a completed race, with the league/series it belongs to. */
export type CareerRow = {
  leagueId: string;
  leagueName: string;
  series: string;
  finishPos: number;
  startPos: number | null;
  points: number;
};

export type CareerTotals = {
  starts: number;
  wins: number;
  top5: number;
  top10: number;
  poles: number;
  /** Mean finishing position across starts; 0 when there are none. */
  avgFinish: number;
  points: number;
};

export type CareerBreakdown = CareerTotals & {
  /** Grouping key (leagueId or series value). */
  key: string;
  /** Display label (league name or series value). */
  label: string;
};

export type CareerStats = {
  totals: CareerTotals;
  byLeague: CareerBreakdown[];
  bySeries: CareerBreakdown[];
};

function tally(rows: CareerRow[]): CareerTotals {
  let wins = 0;
  let top5 = 0;
  let top10 = 0;
  let poles = 0;
  let finishSum = 0;
  let points = 0;

  for (const row of rows) {
    points += row.points;
    finishSum += row.finishPos;
    if (row.finishPos === 1) wins += 1;
    if (row.finishPos <= 5) top5 += 1;
    if (row.finishPos <= 10) top10 += 1;
    if (row.startPos === 1) poles += 1;
  }

  const starts = rows.length;
  return {
    starts,
    wins,
    top5,
    top10,
    poles,
    points,
    avgFinish: starts > 0 ? finishSum / starts : 0,
  };
}

/** Group rows by a key, tally each group, and sort by points (desc) then label. */
function breakdown(
  rows: CareerRow[],
  keyOf: (row: CareerRow) => string,
  labelOf: (row: CareerRow) => string,
): CareerBreakdown[] {
  const groups = new Map<string, CareerRow[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const bucket = groups.get(key);
    if (bucket) bucket.push(row);
    else groups.set(key, [row]);
  }

  return [...groups.entries()]
    .map(([key, groupRows]) => ({
      key,
      label: labelOf(groupRows[0]),
      ...tally(groupRows),
    }))
    .sort((a, b) => b.points - a.points || a.label.localeCompare(b.label));
}

/** Roll a player's completed-race results into career totals and breakdowns. */
export function computeCareerStats(rows: CareerRow[]): CareerStats {
  return {
    totals: tally(rows),
    byLeague: breakdown(
      rows,
      (r) => r.leagueId,
      (r) => r.leagueName,
    ),
    bySeries: breakdown(
      rows,
      (r) => r.series,
      (r) => r.series,
    ),
  };
}
