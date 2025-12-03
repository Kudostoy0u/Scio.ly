/**
 * Notifications are deprecated. This hook is retained for compatibility and returns no data.
 */
export function useNotifications() {
	return {
		notifications: [],
		unreadCount: 0,
		loading: false,
		error: null,
		refresh: async () => {},
		markAsRead: async () => {},
		markAllAsRead: async () => {},
		markReadById: async () => {},
	};
}
