import { router } from '../server';
import { teamsRouter } from './teams';

export const appRouter = router({
  teams: teamsRouter,
});

export type AppRouter = typeof appRouter;

