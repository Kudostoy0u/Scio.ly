import { getServerUser } from '@/lib/supabaseServer';
import { TeamDataService } from '@/lib/services/team-data';
import { NotificationsProvider as ClientNotificationsProvider } from '@/app/contexts/NotificationsContext';

export default async function NotificationsProvider({ children }: { children: React.ReactNode }) {
  let user: any = null;
  let initialNotifications: any[] = [];
  let initialUnreadCount = 0;

  try {
    user = await getServerUser();
  } catch {
    console.log('NotificationsProvider: Server-side user detection failed, will use client-side');
    // This is expected during SSR - client-side will handle it
  }

  if (user?.id) {
    try {
      console.log('NotificationsProvider: Fetching notifications for user:', user.id, user.email);
      const { notifications, unread_count } = await TeamDataService.getUserNotifications(
        user.id,
        100, // limit
        0,   // offset
        true // unreadOnly
      );
      console.log('NotificationsProvider: Got notifications:', notifications.length, 'unread:', unread_count);
      initialNotifications = notifications;
      initialUnreadCount = unread_count;
    } catch (error) {
      console.error('Error fetching initial notifications:', error);
      // Continue with empty notifications if there's an error
    }
  } else {
    console.log('NotificationsProvider: No user found server-side, client will handle');
  }

  return (
    <ClientNotificationsProvider 
      initialNotifications={initialNotifications}
      initialUnreadCount={initialUnreadCount}
    >
      {children}
    </ClientNotificationsProvider>
  );
}
