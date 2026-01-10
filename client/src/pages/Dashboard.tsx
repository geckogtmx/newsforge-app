import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { TrendingUp, Zap, FileText, Clock, Play } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const { data: runHistory, isLoading: isLoadingHistory } = trpc.runs.getRunHistory.useQuery();
  const startRun = trpc.runs.startRun.useMutation();

  const lastRun = runHistory && runHistory.length > 0 ? runHistory[0] : null;

  const handleStartNewRun = async () => {
    try {
      toast.info("Starting new run...");
      const result = await startRun.mutateAsync();
      toast.success(`Run started! ID: ${result.runId}`);
      // Navigate to the News Inbox page
      window.location.href = "/run";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start run");
    }
  };

  const stats = lastRun
    ? {
        itemsCollected: lastRun.stats?.itemsCollected ?? 0,
        itemsCompiled: lastRun.stats?.itemsCompiled ?? 0,
        contentItemsCreated: lastRun.stats?.contentItemsCreated ?? 0,
        tokensUsed: lastRun.stats?.tokensUsed ?? 0,
      }
    : {
        itemsCollected: 0,
        itemsCompiled: 0,
        contentItemsCreated: 0,
        tokensUsed: 0,
      };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome to NewsForge</p>
      </div>

      {/* Last Run Stats */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Last Run</h2>
        {isLoadingHistory ? (
          <div className="animate-pulse">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : lastRun ? (
          <p className="text-muted-foreground mb-4">
            Run completed {formatDistanceToNow(new Date(lastRun.completedAt || lastRun.startedAt), { addSuffix: true })}
          </p>
        ) : (
          <p className="text-muted-foreground mb-4">No runs yet</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Items Collected</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.itemsCollected}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Items Compiled</CardTitle>
              <Zap className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.itemsCompiled}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Content Items</CardTitle>
              <FileText className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.contentItemsCreated}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tokens Used</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.tokensUsed.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <Link href="/run">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Start New Run
                </CardTitle>
                <CardDescription>Begin a new news compilation workflow</CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <Link href="/sources">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Manage Sources
                </CardTitle>
                <CardDescription>Configure your news sources</CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <Link href="/archive">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  View Archive
                </CardTitle>
                <CardDescription>Browse previous runs</CardDescription>
              </CardHeader>
            </Link>
          </Card>
        </div>
      </div>

      {/* Start New Run Button */}
      <div className="flex justify-center">
        <Button size="lg" onClick={handleStartNewRun} disabled={startRun.isPending}>
          <Play className="w-5 h-5 mr-2" />
          {startRun.isPending ? "Starting..." : "Start New Run"}
        </Button>
      </div>

      {/* Recent Runs */}
      {runHistory && runHistory.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Runs</h2>
          <div className="space-y-2">
            {runHistory.slice(0, 5).map((run) => (
              <Card key={run.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">
                        Run from {new Date(run.startedAt).toLocaleDateString()}
                      </CardTitle>
                      <CardDescription>
                        Status: {run.status} •{" "}
                        {run.completedAt
                          ? `Completed ${formatDistanceToNow(new Date(run.completedAt), { addSuffix: true })}`
                          : "In progress"}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-sm text-muted-foreground">
                        {run.stats?.itemsCollected ?? 0} items
                      </span>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
