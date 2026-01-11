import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Edit2, RefreshCw, Loader2, Zap, AlertCircle, DollarSign, Info } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Compilation() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split("?")[1]);
  const runId = searchParams.get("runId") || "";

  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [regenerateInstructions, setRegenerateInstructions] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentRegenerateId, setCurrentRegenerateId] = useState<string | null>(null);
  const [costEstimateDialogOpen, setCostEstimateDialogOpen] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);

  // Fetch compiled items for this run
  const { data: items = [], isLoading, error, refetch } = trpc.compilation.getCompiledItems.useQuery(
    { runId },
    { enabled: !!runId }
  );

  // Get cost estimate for YouTube asset generation
  const { data: costEstimate, isLoading: isLoadingCost, refetch: refetchCost } = trpc.youtube.estimateCost.useQuery(
    { runId },
    { enabled: false } // Only fetch when user requests
  );

  const updateSelection = trpc.compilation.updateSelection.useMutation({
    onSuccess: () => {
      toast.success("Selection updated");
    },
    onError: (error) => {
      toast.error(`Failed to update selection: ${error.message}`);
    },
  });

  const regenerateItem = trpc.compilation.regenerateItem.useMutation({
    onSuccess: () => {
      toast.success("Item regenerated successfully");
      refetch();
      setRegeneratingId(null);
      setDialogOpen(false);
      setRegenerateInstructions("");
    },
    onError: (error) => {
      toast.error(`Failed to regenerate: ${error.message}`);
      setRegeneratingId(null);
    },
  });

  // Auto-compilation mutation
  const compileMutation = trpc.compilation.compileHeadlines.useMutation({
    onSuccess: (result) => {
      toast.success(`Compilation complete! Generated ${result.compiledCount} items.`);
      setIsCompiling(false);
      refetch(); // Reload compiled items
    },
    onError: (error) => {
      toast.error(`Compilation failed: ${error.message}`);
      setIsCompiling(false);
    },
  });

  const handleSelectItem = (id: string) => {
    const newSelected = selectedItemIds.includes(id)
      ? selectedItemIds.filter((itemId) => itemId !== id)
      : [...selectedItemIds, id];

    setSelectedItemIds(newSelected);

    // Update in database
    updateSelection.mutate({
      itemIds: [id],
      isSelected: !selectedItemIds.includes(id),
    });
  };

  const handleSelectAll = () => {
    const allSelected = items.length > 0 && selectedItemIds.length === items.length;
    const newSelected = allSelected ? [] : items.map((item) => item.id);

    setSelectedItemIds(newSelected);

    // Update in database
    updateSelection.mutate({
      itemIds: items.map((item) => item.id),
      isSelected: !allSelected,
    });
  };

  const handleRegenerateClick = (id: string) => {
    setCurrentRegenerateId(id);
    setDialogOpen(true);
  };

  const handleRegenerateSubmit = () => {
    if (!currentRegenerateId) return;

    setRegeneratingId(currentRegenerateId);
    regenerateItem.mutate({
      itemId: currentRegenerateId,
      instructions: regenerateInstructions || undefined,
    });
  };

  const handleShowCostEstimate = async () => {
    if (selectedItemIds.length === 0) {
      toast.error("Please select items first");
      return;
    }

    await refetchCost();
    setCostEstimateDialogOpen(true);
  };

  const handleContinue = () => {
    if (selectedItemIds.length === 0) {
      toast.error("Please select at least one item to continue");
      return;
    }
    window.location.href = `/content-package?runId=${runId}`;
  };

  const handleProceedToGenerate = () => {
    setCostEstimateDialogOpen(false);
    handleContinue();
  };

  // Sync selectedItemIds with items from backend
  useEffect(() => {
    if (items.length > 0) {
      setSelectedItemIds(items.filter((item) => item.isSelected).map((item) => item.id));
    }
  }, [items]);

  // Auto-compile when page loads with no items
  useEffect(() => {
    if (!isLoading && !isCompiling && items.length === 0 && runId && !compileMutation.isPending) {
      setIsCompiling(true);
      toast.info("Starting AI compilation...");
      compileMutation.mutate({ runId });
    }
  }, [isLoading, items.length, runId, isCompiling]);

  if (!runId) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No run ID provided. Please start a new run from the dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading || isCompiling) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">
            {isCompiling ? "AI is compiling headlines into topics..." : "Loading compiled items..."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load compiled items: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (items.length === 0 && !isCompiling) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No compiled items found. Compilation will start automatically.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Link href={`/run?runId=${runId}`}>
            <Button>Back to News Inbox</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compilation Review</h1>
          <p className="text-muted-foreground mt-1">
            Review AI-compiled items and select those for content generation
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {selectedItemIds.length} / {items.length} Selected
          </Badge>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between bg-card border rounded-lg p-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleSelectAll}>
            {selectedItemIds.length === items.length ? "Deselect All" : "Select All"}
          </Button>
        </div>
        <Button
          onClick={handleContinue}
          disabled={selectedItemIds.length === 0}
          className="gap-2"
        >
          Continue to Content Package
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Compiled Items List */}
      <div className="space-y-4">
        {items
          .sort((a, b) => (b.heatScore || 0) - (a.heatScore || 0))
          .map((item) => (
            <Card
              key={item.id}
              className={`transition-all ${
                selectedItemIds.includes(item.id)
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/50"
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <Checkbox
                      checked={selectedItemIds.includes(item.id)}
                      onCheckedChange={() => handleSelectItem(item.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-xl">{item.topic}</CardTitle>
                        <Badge variant="outline" className="gap-1">
                          <Zap className="h-3 w-3" />
                          {item.heatScore || 1} {item.heatScore === 1 ? "source" : "sources"}
                        </Badge>
                      </div>
                      <CardDescription className="text-base font-medium text-foreground">
                        {item.hook}
                      </CardDescription>
                    </div>
                  </div>
                  <Dialog open={dialogOpen && currentRegenerateId === item.id} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRegenerateClick(item.id)}
                        disabled={regeneratingId === item.id}
                        className="gap-2"
                      >
                        {regeneratingId === item.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Regenerating...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4" />
                            Regenerate
                          </>
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Regenerate Content</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Provide instructions for regenerating this item (optional):
                          </p>
                          <Textarea
                            placeholder="e.g., Make it more concise, focus on technical details, use a casual tone..."
                            value={regenerateInstructions}
                            onChange={(e) => setRegenerateInstructions(e.target.value)}
                            rows={4}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setDialogOpen(false);
                            setRegenerateInstructions("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleRegenerateSubmit}>
                          Regenerate
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-muted-foreground whitespace-pre-wrap">{item.summary}</p>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-      <div className="flex items-center justify-between p-6 border-t">
        <Link href={`/run?runId=${runId}`}>
          <Button variant="outline">Back to News Inbox</Button>
        </Link>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleShowCostEstimate}
            disabled={selectedItemIds.length === 0}
            className="gap-2"
          >
            <DollarSign className="w-4 h-4" />
            Estimate Cost
          </Button>
          <Button
            onClick={handleContinue}
            disabled={selectedItemIds.length === 0}
            className="gap-2"
          >
            Continue to Content Package
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Cost Estimate Dialog */}
      <Dialog open={costEstimateDialogOpen} onOpenChange={setCostEstimateDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-accent" />
              YouTube Asset Generation Cost
            </DialogTitle>
          </DialogHeader>
          {isLoadingCost ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : costEstimate ? (
            <div className="space-y-4 mt-4">
              <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Estimated Cost</span>
                  <span className="text-2xl font-bold text-accent">
                    ${costEstimate.estimatedCost.toFixed(4)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Estimated Tokens</span>
                  <span className="text-sm font-medium">
                    {costEstimate.estimatedTokens.toLocaleString()}
                  </span>
                </div>
              </div>

              {costEstimate.breakdown && costEstimate.breakdown.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">Cost Breakdown</h4>
                  {costEstimate.breakdown.map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.operation}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.tokens.toLocaleString()} tokens
                        </p>
                      </div>
                      <span className="text-sm font-medium">${item.cost.toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  This estimate covers YouTube title, description, and script outline generation for {selectedItemIds.length} {selectedItemIds.length === 1 ? 'item' : 'items'}.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setCostEstimateDialogOpen(false)}
                  className="flex-1 border-border"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleProceedToGenerate}
                  className="flex-1"
                >
                  Proceed to Generate
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <p>Unable to estimate cost. Please try again.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
