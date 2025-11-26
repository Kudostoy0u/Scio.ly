import Content from "@/app/test/content";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scio.ly | Test",
  description: "Take a Science Olympiad test from tens of thousands of available questions",
};

export const dynamic = "force-dynamic";

import { cookies } from "next/headers";

export default async function Page({
  searchParams,
}: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const cookieStore = await cookies();
  const raw = cookieStore.get("scio_test_params")?.value;
  let parsed: Record<string, unknown> | undefined;
  try {
    parsed = raw ? JSON.parse(decodeURIComponent(raw)) : undefined;
  } catch {
    // ignore malformed cookie
  }

  // Check for assignment parameter in URL
  const resolvedSearchParams = await searchParams;
  const assignmentId = resolvedSearchParams.assignmentId as string | undefined;
  const viewResults = resolvedSearchParams.viewResults as string | undefined;

  // Extract query parameters from URL
  const teamsAssign = resolvedSearchParams.teamsAssign as string | undefined;

  const eventName = parsed?.eventName as string | undefined;
  const questionCount = parsed?.questionCount?.toString() as string | undefined;
  const timeLimit = parsed?.timeLimit?.toString() as string | undefined;
  const types = parsed?.types as string | undefined;
  const division = parsed?.division as string | undefined;
  const subtopics = Array.isArray(parsed?.subtopics) ? (parsed.subtopics as string[]) : undefined;
  const difficulties = Array.isArray(parsed?.difficulties)
    ? (parsed.difficulties as string[])
    : undefined;
  const idPercentage =
    typeof parsed?.idPercentage !== "undefined" ? Number(parsed.idPercentage) : undefined;
  const pureIdOnly = parsed?.pureIdOnly === true;

  // Do not SSR-fetch questions. Client logic handles ID/base composition.
  // Only pass through router parameters so the client can fetch appropriately.
  const initialData: unknown[] | undefined = undefined;
  const initialRouterData:
    | {
        eventName?: string;
        questionCount?: string;
        timeLimit?: string;
        types?: string;
        division?: string;
        subtopics?: string[];
        difficulties?: string[];
        idPercentage?: number;
        pureIdOnly?: boolean;
        assignmentId?: string;
        teamsAssign?: string;
        viewResults?: string;
      }
    | undefined = undefined;

  const baseRouterData = {
    eventName,
    questionCount,
    timeLimit,
    types,
    division,
    subtopics,
    difficulties,
    idPercentage,
    pureIdOnly,
    assignmentId,
    teamsAssign,
    viewResults,
  };

  const finalRouterData = initialRouterData || baseRouterData;

  return <Content initialData={initialData} initialRouterData={finalRouterData} />;
}
