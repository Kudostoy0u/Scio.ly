import { Metadata } from "next";
import Content from "@/app/unlimited/Content";
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: "Scio.ly | Unlimited",
  description: "Unlimited Science Olympiad practice from tens of thousands of available questions"
}
export default async function Page() {
  const cookieStore = await cookies();
  const raw = cookieStore.get('scio_unlimited_params')?.value;
  let parsed: any | undefined;
  try { parsed = raw ? JSON.parse(decodeURIComponent(raw)) : undefined; } catch {}
  return <Content initialRouterData={parsed} />
}