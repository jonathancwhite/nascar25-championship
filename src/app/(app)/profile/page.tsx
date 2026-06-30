import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getOrCreateCurrentUser } from "@/lib/auth";
import { getCareerProfile } from "@/lib/career";

import { CareerProfileView } from "./career-profile-view";

export const metadata: Metadata = {
  title: "My career",
};

export const dynamic = "force-dynamic";

export default async function MyProfilePage() {
  const user = await getOrCreateCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const profile = await getCareerProfile(user.id);
  if (!profile) {
    notFound();
  }

  return <CareerProfileView profile={profile} />;
}
