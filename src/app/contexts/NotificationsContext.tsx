"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext } from "react";

interface NotificationsContextValue {
	notifications: unknown[];
	unreadCount: number;
	refresh: (forceRefresh?: boolean) => Promise<void>;
	markAllRead: () => Promise<void>;
	markReadById: (id: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue>({
	notifications: [],
	unreadCount: 0,
	refresh: async () => {},
	markAllRead: async () => {},
	markReadById: async () => {},
});

export function NotificationsProvider({ children }: PropsWithChildren) {
	return (
		<NotificationsContext.Provider
			value={{
				notifications: [],
				unreadCount: 0,
				refresh: async () => {},
				markAllRead: async () => {},
				markReadById: async () => {},
			}}
		>
			{children}
		</NotificationsContext.Provider>
	);
}

export function useNotifications(): NotificationsContextValue {
	return useContext(NotificationsContext);
}
