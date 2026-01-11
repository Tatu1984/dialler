import { router } from '../server';
import { usersRouter } from './users';
import { teamsRouter } from './teams';
import { campaignsRouter } from './campaigns';
import { leadsRouter } from './leads';
import { leadListsRouter } from './leadLists';
import { queuesRouter } from './queues';
import { skillsRouter } from './skills';
import { dispositionsRouter } from './dispositions';
import { dncRouter } from './dnc';
import { agentsRouter } from './agents';

/**
 * Main application router
 */
export const appRouter = router({
  users: usersRouter,
  teams: teamsRouter,
  campaigns: campaignsRouter,
  leads: leadsRouter,
  leadLists: leadListsRouter,
  queues: queuesRouter,
  skills: skillsRouter,
  dispositions: dispositionsRouter,
  dnc: dncRouter,
  agents: agentsRouter,
});

export type AppRouter = typeof appRouter;

// Re-export individual routers for direct use
export {
  usersRouter,
  teamsRouter,
  campaignsRouter,
  leadsRouter,
  leadListsRouter,
  queuesRouter,
  skillsRouter,
  dispositionsRouter,
  dncRouter,
  agentsRouter,
};
