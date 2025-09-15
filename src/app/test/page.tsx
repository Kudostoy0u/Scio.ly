import { Metadata } from "next";
import Content from "@/app/test/Content";

export const metadata: Metadata = {
  title: "Scio.ly | Test",
  description: "Take a Science Olympiad test from tens of thousands of available questions"
}

export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';

export default async function Page() {
  const cookieStore = await cookies();
  const raw = cookieStore.get('scio_test_params')?.value;
  let parsed: any | undefined;
  try { parsed = raw ? JSON.parse(decodeURIComponent(raw)) : undefined; } catch {
    // ignore malformed cookie
  }
  const eventName = parsed?.eventName as string | undefined;
  const questionCount = parsed?.questionCount?.toString() as string | undefined;
  const timeLimit = parsed?.timeLimit?.toString() as string | undefined;
  const types = parsed?.types as string | undefined;
  const division = parsed?.division as string | undefined;
  const subtopics = Array.isArray(parsed?.subtopics) ? parsed.subtopics as string[] : undefined;
  const idPercentage = typeof parsed?.idPercentage !== 'undefined' ? Number(parsed.idPercentage) : undefined;

  let initialData: any[] | undefined = undefined;
  let initialRouterData:
    | {
        eventName?: string;
        questionCount?: string;
        timeLimit?: string;
        types?: string;
        division?: string;
        subtopics?: string[];
        idPercentage?: number;
      }
    | undefined = undefined;

  if (eventName && questionCount) {

    const params = new URLSearchParams();
    params.set('event', eventName);
    params.set('limit', String(parseInt(questionCount)));
    if (types === 'multiple-choice') params.set('question_type', 'mcq');
    if (types === 'free-response') params.set('question_type', 'frq');
    if (division && division !== 'any') params.set('division', division);
    if (subtopics && subtopics.length > 0) params.set('subtopics', subtopics.join(','));

    try {
      const origin = process.env.NEXT_PUBLIC_SITE_URL ?? '';
      const res = await fetch(`${origin}/api/questions?${params.toString()}`, {
        // ensure no caching per-user
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        const questions = Array.isArray(json.data) ? json.data : json.data?.questions || [];

        const valid = questions.filter((q: any) => q.answers && Array.isArray(q.answers) && q.answers.length > 0);
        const selected = valid.slice(0, parseInt(questionCount));
        initialData = selected.map((q: any, idx: number) => ({ ...q, originalIndex: idx }));
        initialRouterData = {
          eventName,
          questionCount,
          timeLimit,
          types,
          division,
          subtopics,
          idPercentage,
        };
      }
    } catch {
      // fall back to client fetch
    }
  }


const baseRouterData = {
  eventName,
  questionCount,
  timeLimit,
  types,
  division,
  subtopics,
  idPercentage,
};


const finalRouterData = initialRouterData || baseRouterData;

return <Content initialData={initialData} initialRouterData={finalRouterData} />;
}