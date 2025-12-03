import { router } from "@/lib/trpc/server";
import { teamsRouter } from "./teams";

export const appRouter = router({
	teams: teamsRouter,
});

export type AppRouter = typeof appRouter;
