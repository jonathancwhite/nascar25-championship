import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";

import { PublicHeader } from "@/components/public-header";

export const metadata: Metadata = {
  title: "Sign up",
};

export default function SignUpPage() {
  return (
    <>
      <PublicHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <SignUp />
      </main>
    </>
  );
}
