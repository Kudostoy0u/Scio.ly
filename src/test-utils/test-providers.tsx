import { AuthProvider } from "@/app/contexts/AuthContext";
import { ThemeProvider } from "@/app/contexts/ThemeContext";
import { NotificationsProvider } from "@/app/contexts/notificationsContext";
import type { User } from "@supabase/supabase-js";
import type React from "react";

interface TestProvidersProps {
	children: React.ReactNode;
	initialDarkMode?: boolean;
	initialUser?: User | null;
}

export function TestProviders({
	children,
	initialDarkMode = false,
	initialUser = null,
}: TestProvidersProps) {
	return (
		<ThemeProvider initialDarkMode={initialDarkMode}>
			<AuthProvider initialUser={initialUser}>
				<NotificationsProvider>{children}</NotificationsProvider>
			</AuthProvider>
		</ThemeProvider>
	);
}

// Removed unused exports: MockThemeProvider, MockAuthProvider
