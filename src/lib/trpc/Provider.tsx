"use client";

import { queryClient } from "@/lib/query/client";
import { queryPersister } from "@/lib/query/persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useState } from "react";
import type { ReactNode } from "react";
import { getTRPCClient, trpc } from "./client";

export function TRPCProvider({ children }: { children: ReactNode }) {
	const [client] = useState(() => queryClient);
	const [trpcClient] = useState(() => getTRPCClient());

	return (
		<PersistQueryClientProvider
			client={client}
			persistOptions={{
				persister: queryPersister,
				maxAge: 1000 * 60 * 60 * 24, // 24 hours
				buster: "teams",
			}}
		>
			<trpc.Provider client={trpcClient} queryClient={client}>
				{children}
			</trpc.Provider>
		</PersistQueryClientProvider>
	);
}
