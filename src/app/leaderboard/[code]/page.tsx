"use client";
import logger from "@/lib/utils/logger";

import Header from "@/app/components/Header";
import { useAuth } from "@/app/contexts/AuthContext";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function JoinLeaderboardPage({
	params,
}: { params: Promise<{ code: string }> }) {
	const router = useRouter();
	const { darkMode } = useTheme();
	const { client } = useAuth();
	const [code, setCode] = useState<string | null>(null);

	useEffect(() => {
		const getCode = async () => {
			const { code: resolvedCode } = await params;
			setCode(resolvedCode);
		};
		getCode();
	}, [params]);

	const joinLeaderboard = useCallback(async () => {
		if (!code) {
			return;
		}

		const {
			data: { user },
		} = await client.auth.getUser();

		if (!user) {
			router.push(`/?join=${code}`);
			return;
		}

		const { error } = await (
			client.rpc as unknown as (
				name: string,
				args?: Record<string, unknown>,
			) => Promise<{ error: unknown }>
		)("join_leaderboard_by_code", {
			p_join_code: code.toUpperCase(),
		});

		if (error) {
			logger.error("Error joining leaderboard:", error);
			router.push("/leaderboard");
		} else {
			router.push("/leaderboard");
		}
	}, [code, router, client]);

	useEffect(() => {
		if (code) {
			joinLeaderboard();
		}
	}, [joinLeaderboard, code]);

	return (
		<div className={`min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
			<Header />
			<div className="pt-20 flex items-center justify-center min-h-[calc(100vh-5rem)]">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
					<p className={`text-lg ${darkMode ? "text-white" : "text-gray-900"}`}>
						Joining leaderboard...
					</p>
				</div>
			</div>
		</div>
	);
}
