import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { LandingHero } from "@/components/marketing/landing-hero";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return <LandingHero />;
}
