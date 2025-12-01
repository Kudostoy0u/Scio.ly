import Content from "@/app/unlimited/content";
import type { Metadata } from "next";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "Scio.ly | Unlimited",
  description: "Unlimited Science Olympiad practice from tens of thousands of available questions",
};
export default async function Page() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("scio_unlimited_params")?.value;
  let parsed: Record<string, unknown> | undefined;
  try {
    parsed = raw ? JSON.parse(decodeURIComponent(raw)) : undefined;
  } catch {
    // Ignore errors
  }
  return <Content initialRouterData={parsed} />;
}
