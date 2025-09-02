import { supabase } from '@/lib/supabase';

export async function updateLeaderboardStats(questionsAttempted: number, correctAnswers: number) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return;
  

  await supabase.rpc('update_leaderboard_stats', {
    p_user_id: user.id,
    p_questions_attempted: questionsAttempted,
    p_correct_answers: correctAnswers
  });
}

export async function checkAndJoinFromUrl() {

  const urlParams = new URLSearchParams(window.location.search);
  const joinCode = urlParams.get('join');
  
  if (joinCode) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {

      await supabase.rpc('join_leaderboard_by_code', { 
        p_join_code: joinCode.toUpperCase() 
      });
      

      urlParams.delete('join');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }
  }
}