import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCareerProfile } from "@/lib/career";

import { CareerProfileView } from "../career-profile-view";

export const metadata: Metadata = {
  title: "Driver career",
};

export const dynamic = "force-dynamic";

// Public, read-only career view for any user (NASCAR-012). Reaching this page
// implies a signed-in viewer (the /profile route is protected by middleware).
export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const profile = await getCareerProfile(userId);
  if (!profile) {
    notFound();
  }

  return <CareerProfileView profile={profile} />;
}
