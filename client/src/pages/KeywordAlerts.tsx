import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Bell, Plus, Trash2, Edit, TrendingUp } from "lucide-react";

export default function KeywordAlerts() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [notifyDesktop, setNotifyDesktop] = useState(true);
  const [autoTag, setAutoTag] = useState(true);

  const { data: alerts, isLoading, refetch } = trpc.alerts.list.useQuery();
  const createAlert = trpc.alerts.create.useMutation();
  const updateAlert = trpc.alerts.update.useMutation();
  const deleteAlert = trpc.alerts.delete.useMutation();

  const handleCreateAlert = async () => {
    if (!newKeyword.trim()) {
      toast.error("Please enter a keyword");
      return;
    }

    try {
      await createAlert.mutateAsync({
        keyword: newKeyword.trim(),
        notifyDesktop,
        autoTag,
      });

      toast.success(`Alert created for "${newKeyword}"`);
      setNewKeyword("");
      setIsAddDialogOpen(false);
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create alert");
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateAlert.mutateAsync({
        id,
        isActive: !isActive,
      });

      toast.success(isActive ? "Alert disabled" : "Alert enabled");
      refetch();
    } catch (error) {
      toast.error("Failed to update alert");
    }
  };

  const handleDeleteAlert = async (id: string, keyword: string) => {
    if (!confirm(`Delete alert for "${keyword}"?`)) {
      return;
    }

    try {
      await deleteAlert.mutateAsync({ id });
      toast.success("Alert deleted");
      refetch();
    } catch (error) {
      toast.error("Failed to delete alert");
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Keyword Alerts</h1>
          <p className="text-muted-foreground mt-2">
            Get notified when headlines match your watchwords
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Alert
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Keyword Alert</DialogTitle>
              <DialogDescription>
                Enter a keyword or phrase to monitor in news headlines
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="keyword">Keyword</Label>
                <Input
                  id="keyword"
                  placeholder="e.g., artificial intelligence, climate change"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateAlert();
                    }
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="notify-desktop">Desktop Notifications</Label>
                <Switch
                  id="notify-desktop"
                  checked={notifyDesktop}
                  onCheckedChange={setNotifyDesktop}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="auto-tag">Auto-tag Headlines</Label>
                <Switch
                  id="auto-tag"
                  checked={autoTag}
                  onCheckedChange={setAutoTag}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAlert} disabled={createAlert.isPending}>
                {createAlert.isPending ? "Creating..." : "Create Alert"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!alerts || alerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Keyword Alerts</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first keyword alert to get notified when important topics appear
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Alert
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {alerts.map((alert) => (
            <Card key={alert.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">{alert.keyword}</CardTitle>
                      <Badge variant={alert.isActive ? "default" : "secondary"}>
                        {alert.isActive ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                    <CardDescription className="mt-2 flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        {alert.matchCount ?? 0} matches
                      </span>
                      {alert.notifyDesktop && (
                        <span className="flex items-center gap-1">
                          <Bell className="w-4 h-4" />
                          Desktop notifications
                        </span>
                      )}
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(alert.id, alert.isActive)}
                    >
                      {alert.isActive ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteAlert(alert.id, alert.keyword)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>How Keyword Alerts Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Alerts are checked during each news run when headlines are collected</p>
          <p>• Matched headlines are highlighted in the News Inbox</p>
          <p>• Desktop notifications are sent immediately when matches are found</p>
          <p>• Auto-tagging helps you filter and organize matched headlines</p>
          <p>• Keywords are case-insensitive and match partial words</p>
        </CardContent>
      </Card>
    </div>
  );
}
