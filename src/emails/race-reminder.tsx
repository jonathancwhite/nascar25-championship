import { Button, Section, Text } from "@react-email/components";

import { EmailLayout, text } from "./components/email-layout";

export type RaceReminderEmailProps = {
  leagueName: string;
  round: number;
  trackName: string;
  dateText: string;
  daysUntil: number;
  raceUrl: string;
  unsubscribeUrl: string;
};

// Lead-time reminder before a race (NASCAR-052). Member-facing → unsubscribe.
export function RaceReminderEmail({
  leagueName,
  round,
  trackName,
  dateText,
  daysUntil,
  raceUrl,
  unsubscribeUrl,
}: RaceReminderEmailProps) {
  return (
    <EmailLayout
      preview={`Reminder: Round ${round} at ${trackName} in ${daysUntil} days`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={text.heading}>Race day is coming up</Text>
      <Text style={text.paragraph}>
        Round {round} of <strong>{leagueName}</strong> is{" "}
        {daysUntil === 1 ? "tomorrow" : `in ${daysUntil} days`}. Make sure
        you&apos;re ready.
      </Text>
      <Text style={text.detail}>Track: {trackName}</Text>
      <Text style={text.detail}>When: {dateText}</Text>
      <Section style={{ margin: "16px 0 4px" }}>
        <Button style={text.button} href={raceUrl}>
          View race details
        </Button>
      </Section>
    </EmailLayout>
  );
}

export default function Preview() {
  return (
    <RaceReminderEmail
      leagueName="Sunday Night Throwdown"
      round={3}
      trackName="Talladega"
      dateText="Sun, Jul 12, 2026, 8:00 PM EDT"
      daysUntil={5}
      raceUrl="https://example.com/leagues/abc/races/xyz"
      unsubscribeUrl="https://example.com/unsubscribe?token=demo"
    />
  );
}
