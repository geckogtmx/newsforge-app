import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Play, TrendingUp, Zap, Clock } from "lucide-react";

export default function Dashboard() {
  // TODO: Fetch last run data from API
  const lastRun = {
    date: new Date().toLocaleDateString(),
    itemsCollected: 42,
    itemsCompiled: 28,
    contentItemsCreated: 12,
    tokensUsed: 15234,
  };

  const stats = [
    {
      label: "Items Collected",
      value: lastRun.itemsCollected,
      icon: TrendingUp,
      color: "text-blue-400",
    },
    {
      label: "Items Compiled",
      value: lastRun.itemsCompiled,
      icon: Zap,
      color: "text-green-400",
    },
    {
      label: "Content Items",
      value: lastRun.contentItemsCreated,
      icon: Play,
      color: "text-purple-400",
    },
    {
      label: "Tokens Used",
      value: lastRun.tokensUsed.toLocaleString(),
      icon: Clock,
      color: "text-orange-400",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-border">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome to NewsForge</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="space-y-8">
          {/* Last Run Section */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Last Run</h2>
            <p className="text-sm text-muted-foreground mb-4">Run completed on {lastRun.date}</p>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label} className="bg-card border-border">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          {stat.label}
                        </CardTitle>
                        <Icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/run">
                <Card className="bg-card border-border hover:border-accent transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">Start New Run</CardTitle>
                    <CardDescription>Begin a new news compilation workflow</CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/sources">
                <Card className="bg-card border-border hover:border-accent transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">Manage Sources</CardTitle>
                    <CardDescription>Configure your news sources</CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/archive">
                <Card className="bg-card border-border hover:border-accent transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">View Archive</CardTitle>
                    <CardDescription>Browse previous runs</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </div>
          </div>

          {/* CTA Button */}
          <div className="flex justify-center pt-4">
            <Link href="/run">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Play className="w-5 h-5 mr-2" />
                Start New Run
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
