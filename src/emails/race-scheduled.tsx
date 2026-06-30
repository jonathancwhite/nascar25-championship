import { Button, Section, Text } from "@react-email/components";

import { EmailLayout, text } from "./components/email-layout";

export type RaceScheduledEmailProps = {
  leagueName: string;
  round: number;
  trackName: string;
  dateText: string;
  raceUrl: string;
  unsubscribeUrl: string;
};

// Sent when an admin dates a race (NASCAR-051). Goes to league members, so it
// carries the per-league unsubscribe link.
export function RaceScheduledEmail({
  leagueName,
  round,
  trackName,
  dateText,
  raceUrl,
  unsubscribeUrl,
}: RaceScheduledEmailProps) {
  return (
    <EmailLayout
      preview={`Round ${round} at ${trackName} is scheduled`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={text.heading}>A race is on the calendar</Text>
      <Text style={text.paragraph}>
        Round {round} of <strong>{leagueName}</strong> has been scheduled.
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
    <RaceScheduledEmail
      leagueName="Sunday Night Throwdown"
      round={3}
      trackName="Talladega"
      dateText="Sun, Jul 12, 2026, 8:00 PM EDT"
      raceUrl="https://example.com/leagues/abc/races/xyz"
      unsubscribeUrl="https://example.com/unsubscribe?token=demo"
    />
  );
}
