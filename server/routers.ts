import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { sourcesRouter } from "./routers/sources";
import { runsRouter } from "./routers/runs";
import { alertsRouter } from "./routers/alerts";
import { compilationRouter } from "./routers/compilation";
import { youtubeRouter } from "./routers/youtube";
import { exportRouter } from "./routers/export";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  sources: sourcesRouter,
  runs: runsRouter,
  alerts: alertsRouter,
  compilation: compilationRouter,
  youtube: youtubeRouter,
  export: exportRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
