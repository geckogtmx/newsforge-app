import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Trash2, Plus, Loader2, Search, Tag } from "lucide-react";
import { toast } from "sonner";

export function AlertsManager() {
  const [newKeyword, setNewKeyword] = useState("");
  const utils = trpc.useUtils();

  // Queries
  const { data: alerts, isLoading } = trpc.alerts.list.useQuery();

  // Mutations
  const createMutation = trpc.alerts.create.useMutation({
    onSuccess: () => {
      setNewKeyword("");
      utils.alerts.list.invalidate();
      toast.success("Alert created successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const toggleMutation = trpc.alerts.toggle.useMutation({
    onSuccess: () => {
      utils.alerts.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.alerts.delete.useMutation({
    onSuccess: () => {
      utils.alerts.list.invalidate();
      toast.success("Alert deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleAddAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    createMutation.mutate({ keyword: newKeyword.trim() });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Bell className="w-5 h-5 text-accent" />
            Keyword Alerts
          </CardTitle>
          <CardDescription>
            Monitor specific topics and get notified when they appear in your feeds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddAlert} className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Enter keyword or topic (e.g. 'Nvidia', 'OpenAI')"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                className="pl-9 bg-input border-border"
                disabled={createMutation.isPending}
              />
            </div>
            <Button type="submit" disabled={createMutation.isPending || !newKeyword.trim()}>
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Alert
                </>
              )}
            </Button>
          </form>

          <div className="grid gap-4 md:grid-cols-2">
            {alerts?.length === 0 ? (
              <div className="col-span-full text-center py-12 border-2 border-dashed border-border rounded-lg">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground">No alerts configured yet.</p>
              </div>
            ) : (
              alerts?.map((alert) => (
                <Card key={alert.id} className="bg-muted/30 border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-bold text-foreground text-lg">{alert.keyword}</h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Tag className="w-3 h-3" />
                          {alert.matchCount || 0} matches found
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => deleteMutation.mutate({ id: alert.id })}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-border/50">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`active-${alert.id}`} className="text-sm cursor-pointer">
                          Active Monitoring
                        </Label>
                        <Switch
                          id={`active-${alert.id}`}
                          checked={alert.isActive}
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({ id: alert.id, isActive: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`notify-${alert.id}`} className="text-sm cursor-pointer">
                          Desktop Notifications
                        </Label>
                        <Switch
                          id={`notify-${alert.id}`}
                          checked={alert.notifyDesktop}
                          disabled={!alert.isActive}
                          onCheckedChange={(checked) =>
                            toast.info("Notification preference updated (simulated)")
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
