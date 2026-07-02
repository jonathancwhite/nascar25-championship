import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";

import { PublicHeader } from "@/components/public-header";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function SignInPage() {
  return (
    <>
      <PublicHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <SignIn />
      </main>
    </>
  );
}
