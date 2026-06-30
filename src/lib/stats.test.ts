// Unit tests for career stats aggregation (NASCAR-012). No DB.

import assert from "node:assert/strict";
import { test } from "node:test";

import { computeCareerStats, type CareerRow } from "./stats";

function row(over: Partial<CareerRow>): CareerRow {
  return {
    leagueId: "lg1",
    leagueName: "Alpha",
    series: "CUP",
    finishPos: 10,
    startPos: 10,
    points: 27,
    ...over,
  };
}

test("empty input yields zeroed totals and no breakdowns", () => {
  const stats = computeCareerStats([]);
  assert.deepEqual(stats.totals, {
    starts: 0,
    wins: 0,
    top5: 0,
    top10: 0,
    poles: 0,
    avgFinish: 0,
    points: 0,
  });
  assert.deepEqual(stats.byLeague, []);
  assert.deepEqual(stats.bySeries, []);
});

test("totals count wins, top5/top10, poles, points, and average finish", () => {
  const rows = [
    row({ finishPos: 1, startPos: 1, points: 40 }), // win + pole + top5/10
    row({ finishPos: 4, startPos: 6, points: 33 }), // top5/10
    row({ finishPos: 8, startPos: 1, points: 29 }), // pole + top10
    row({ finishPos: 20, startPos: 12, points: 17 }), // none
  ];
  const { totals } = computeCareerStats(rows);
  assert.equal(totals.starts, 4);
  assert.equal(totals.wins, 1);
  assert.equal(totals.top5, 2);
  assert.equal(totals.top10, 3);
  assert.equal(totals.poles, 2);
  assert.equal(totals.points, 119);
  assert.equal(totals.avgFinish, (1 + 4 + 8 + 20) / 4);
});

test("null start position never counts as a pole", () => {
  const { totals } = computeCareerStats([
    row({ finishPos: 1, startPos: null }),
  ]);
  assert.equal(totals.poles, 0);
  assert.equal(totals.wins, 1);
});

test("breaks down by league and by series, sorted by points desc", () => {
  const rows = [
    row({ leagueId: "lg1", leagueName: "Alpha", series: "CUP", points: 40 }),
    row({ leagueId: "lg1", leagueName: "Alpha", series: "CUP", points: 35 }),
    row({ leagueId: "lg2", leagueName: "Bravo", series: "TRUCK", points: 34 }),
  ];
  const { byLeague, bySeries } = computeCareerStats(rows);

  assert.deepEqual(
    byLeague.map((b) => [b.key, b.label, b.starts, b.points]),
    [
      ["lg1", "Alpha", 2, 75],
      ["lg2", "Bravo", 1, 34],
    ],
  );
  assert.deepEqual(
    bySeries.map((b) => [b.key, b.starts, b.points]),
    [
      ["CUP", 2, 75],
      ["TRUCK", 1, 34],
    ],
  );
});
