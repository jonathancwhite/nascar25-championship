import Link from "next/link";

import { LocalDateTime } from "@/components/local-date-time";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CareerProfile } from "@/lib/career";
import { SERIES_LABELS, type SeriesValue } from "@/lib/series";
import type { CareerBreakdown } from "@/lib/stats";

function seriesLabel(series: string): string {
  return SERIES_LABELS[series as SeriesValue] ?? series;
}

function formatAvg(avg: number): string {
  return avg > 0 ? avg.toFixed(1) : "—";
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

// Shared, read-only career view (NASCAR-012) for both /profile and
// /profile/[userId]. Stats are aggregated across every league the player races in.
export function CareerProfileView({ profile }: { profile: CareerProfile }) {
  const { displayName, stats, recent } = profile;
  const t = stats.totals;

  const tiles: { label: string; value: string | number }[] = [
    { label: "Starts", value: t.starts },
    { label: "Wins", value: t.wins },
    { label: "Top 5", value: t.top5 },
    { label: "Top 10", value: t.top10 },
    { label: "Poles", value: t.poles },
    { label: "Avg finish", value: formatAvg(t.avgFinish) },
    { label: "Points", value: t.points },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-full text-lg font-semibold">
          {initials(displayName)}
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {displayName}
          </h1>
          <p className="text-muted-foreground mt-1">
            Career across all leagues
          </p>
        </div>
      </div>

      {t.starts === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center">
            No completed races yet. Career stats appear here once results are
            entered.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {tiles.map((tile) => (
              <Card key={tile.label}>
                <CardContent className="py-4 text-center">
                  <div className="text-2xl font-bold tabular-nums">
                    {tile.value}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {tile.label}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <BreakdownCard title="By league" rows={stats.byLeague} />
            <BreakdownCard
              title="By series"
              rows={stats.bySeries}
              formatLabel={seriesLabel}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent results</CardTitle>
              <CardDescription>Last {recent.length} races.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Race</TableHead>
                    <TableHead>League</TableHead>
                    <TableHead className="text-right">Finish</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((r) => (
                    <TableRow key={r.raceId}>
                      <TableCell>
                        <Link
                          href={`/leagues/${r.leagueId}/races/${r.raceId}`}
                          className="hover:text-foreground font-medium hover:underline"
                        >
                          R{r.round} · {r.trackName}
                        </Link>
                        <span className="text-muted-foreground ml-2 text-xs">
                          {seriesLabel(r.series)}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.leagueName}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        P{r.finishPos}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.points}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right">
                        <LocalDateTime value={r.completedAt} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function BreakdownCard({
  title,
  rows,
  formatLabel,
}: {
  title: string;
  rows: CareerBreakdown[];
  formatLabel?: (label: string) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {title === "By series" ? "Series" : "League"}
              </TableHead>
              <TableHead className="text-right">Starts</TableHead>
              <TableHead className="text-right">Wins</TableHead>
              <TableHead className="text-right">Points</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.key}>
                <TableCell className="font-medium">
                  {formatLabel ? formatLabel(row.label) : row.label}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.starts}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.wins}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.points}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
