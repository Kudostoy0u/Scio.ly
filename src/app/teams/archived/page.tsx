import { getServerUser } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import ArchivedTeamsClient from './ArchivedTeamsClient';

export default async function ArchivedTeamsPage() {
  const user = await getServerUser();
  if (!user?.id) redirect('/auth');
  
  return <ArchivedTeamsClient />;
}
