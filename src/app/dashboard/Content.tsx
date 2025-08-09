import DashboardMain from './components/DashboardMain';
import { createSupabaseServerClient, getServerUser } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export default async function DashboardContent() {
  const user = await getServerUser();

  let initialMetrics: {
    questionsAttempted: number;
    correctAnswers: number;
    eventsPracticed: string[];
    accuracy: number;
  } | undefined = undefined;

  let initialHistoryData:
    | {
        historicalData: { date: string; count: number }[];
        historyData: Record<string, { questionsAttempted: number; correctAnswers: number }>;
      }
    | undefined = undefined;

  if (user) {
    const supabase = await createSupabaseServerClient();
    const today = new Date().toISOString().split('T')[0];

    // Daily metrics
    const { data: stat } = await (supabase as any)
      .from('user_stats')
      .select('date, questions_attempted, correct_answers, events_practiced')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    if (stat) {
      const accuracy = stat.questions_attempted > 0 ? (stat.correct_answers / stat.questions_attempted) * 100 : 0;
      initialMetrics = {
        questionsAttempted: stat.questions_attempted || 0,
        correctAnswers: stat.correct_answers || 0,
        eventsPracticed: stat.events_practiced || [],
        accuracy,
      };
    }

    // Historical activity (by day) from user_stats
    const { data: hist } = await (supabase as any)
      .from('user_stats')
      .select('date, questions_attempted, correct_answers, events_practiced')
      .eq('user_id', user.id)
      .order('date', { ascending: true });

    if (hist) {
      const historicalData = hist.map((item: any) => ({
        date: item.date,
        count: item.questions_attempted || 0,
      }));

      const historyData: Record<string, { questionsAttempted: number; correctAnswers: number }> = {};
      hist.forEach((item: any) => {
        const dateStr = item.date;
        historyData[dateStr] = {
          questionsAttempted: item.questions_attempted || 0,
          correctAnswers: item.correct_answers || 0,
          // @ts-expect-error -- extend shape for client history usage
          eventsPracticed: item.events_practiced || [],
        };
      });

      initialHistoryData = { historicalData, historyData };
    }
  }

  return (
    <DashboardMain
      initialUser={user}
      initialMetrics={initialMetrics}
      initialHistoryData={initialHistoryData}
    />
  );
}
