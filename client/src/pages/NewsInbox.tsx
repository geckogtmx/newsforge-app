import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ExternalLink, Search, ChevronRight, Filter, Globe, Loader2, Plus, X, Flame, ChevronDown, ChevronUp, DollarSign, Info, Bell } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface Headline {
  id: number;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: Date;
  isSelected: boolean;
  category?: string;
  deduplicationGroupId?: string;
  heatScore?: number;
  isBestVersion?: boolean;
  matchedKeywords?: string[] | string;
}

interface DeduplicationGroup {
  groupId: string;
  topic: string;
  heatScore: number;
  headlineCount: number;
  bestVersionId: number;
}

export default function NewsInbox() {
  const [, navigate] = useLocation();
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery2, setSearchQuery2] = useState("");
  const [deduplicationGroups, setDeduplicationGroups] = useState<DeduplicationGroup[]>([]);
  const [showDeduplication, setShowDeduplication] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showCostEstimate, setShowCostEstimate] = useState(false);
  const [costEstimateDialogOpen, setCostEstimateDialogOpen] = useState(false);

  // Get current run
  const { data: currentRun, isLoading: isLoadingRun } = trpc.runs.getCurrentRun.useQuery();

  // Get headlines for current run
  const { data: headlinesData, isLoading: isLoadingHeadlines } = trpc.runs.getHeadlines.useQuery(
    { runId: currentRunId || "" },
    { enabled: !!currentRunId }
  );

  // Get cost estimate for selected headlines
  const { data: costEstimate, isLoading: isLoadingCost, refetch: refetchCost } = trpc.compilation.estimateCost.useQuery(
    { runId: currentRunId || "" },
    { enabled: false } // Only fetch when user requests
  );

  // Start new run mutation
  const startRunMutation = trpc.runs.startRun.useMutation({
    onSuccess: (data) => {
      setCurrentRunId(data.runId);
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Update headline selection mutation
  const updateSelectionMutation = trpc.runs.updateHeadlineSelection.useMutation({
    onSuccess: () => {
      toast.success("Selection saved");
      navigate("/compilation");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Broader web search mutation
  const broadSearchMutation = trpc.runs.broadSearch.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      // Refetch headlines to include new search results
      if (currentRunId) {
        window.location.reload(); // Simple refresh to reload headlines
      }
      setIsSearchOpen(false);
      setSearchQuery2("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Deduplication mutation
  const deduplicationMutation = trpc.runs.deduplicateHeadlines.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setDeduplicationGroups(data.groups || []);
      setShowDeduplication(true);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Initialize: check for current run or start a new one
  useEffect(() => {
    if (!isLoadingRun) {
      if (currentRun) {
        setCurrentRunId(currentRun.id);
      } else {
        // No active run, start a new one
        startRunMutation.mutate();
      }
    }
  }, [currentRun, isLoadingRun]);

  // Update headlines when data is loaded
  useEffect(() => {
    if (headlinesData) {
          setHeadlines(
        headlinesData.map((h) => ({
          id: h.id,
          title: h.title,
          description: h.description || "",
          url: h.url,
          source: h.source,
          publishedAt: h.publishedAt ? new Date(h.publishedAt) : new Date(),
          isSelected: h.isSelected,
          category: undefined, // TODO: Add category extraction
          matchedKeywords: h.matchedKeywords,
        }))
      );
      setSelectedCount(headlinesData.filter((h) => h.isSelected).length);
    }
  }, [headlinesData]);

  // Get unique categories
  const categories = Array.from(new Set(headlines.map((h) => h.category).filter(Boolean))) as string[];

  const handleSelectHeadline = (id: number) => {
    setHeadlines(
      headlines.map((h) => {
        if (h.id === id) {
          setSelectedCount(h.isSelected ? selectedCount - 1 : selectedCount + 1);
          return { ...h, isSelected: !h.isSelected };
        }
        return h;
      })
    );
  };

  const handleSelectAll = () => {
    const allSelected = filteredHeadlines.every((h) => h.isSelected);
    const newHeadlines = headlines.map((h) => {
      if (filteredHeadlines.find((fh) => fh.id === h.id)) {
        return { ...h, isSelected: !allSelected };
      }
      return h;
    });
    setHeadlines(newHeadlines);
    const newCount = newHeadlines.filter((h) => h.isSelected).length;
    setSelectedCount(newCount);
  };

  const handleShowCostEstimate = async () => {
    if (!currentRunId) {
      toast.error("No active run");
      return;
    }

    if (selectedCount === 0) {
      toast.error("Please select headlines first");
      return;
    }

    setShowCostEstimate(true);
    await refetchCost();
    setCostEstimateDialogOpen(true);
  };

  const handleContinueToCompile = () => {
    if (!currentRunId) {
      toast.error("No active run");
      return;
    }

    if (selectedCount === 0) {
      toast.error("Please select at least one headline");
      return;
    }

    const selectedIds = headlines.filter((h) => h.isSelected).map((h) => h.id);
    updateSelectionMutation.mutate({
      runId: currentRunId,
      headlineIds: selectedIds,
    });
  };

  const handleProceedToCompile = () => {
    setCostEstimateDialogOpen(false);
    handleContinueToCompile();
  };

  const handleBroaderSearch = async () => {
    if (!searchQuery2.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    if (!currentRunId) {
      toast.error("No active run");
      return;
    }

    setIsSearching(true);
    broadSearchMutation.mutate({
      runId: currentRunId,
      query: searchQuery2,
      maxResults: 10,
    });
    setIsSearching(false);
  };

  const handleDeduplication = () => {
    if (!currentRunId) {
      toast.error("No active run");
      return;
    }

    deduplicationMutation.mutate({
      runId: currentRunId,
      threshold: 0.75,
    });
  };

  const toggleGroupExpansion = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const filteredHeadlines = headlines.filter((h) => {
    const matchesSearch =
      h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || h.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Loading state
  if (isLoadingRun || startRunMutation.isPending || isLoadingHeadlines) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
        <p className="text-muted-foreground text-lg">
          {startRunMutation.isPending ? "Starting new run..." : "Loading headlines..."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-border">
        <h1 className="text-3xl font-bold text-foreground">News Inbox</h1>
        <p className="text-muted-foreground mt-1">
          {filteredHeadlines.length} of {headlines.length} headlines • {selectedCount} selected
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="flex gap-4 flex-col md:flex-row md:items-end">
              <div className="flex-1">
                <Label htmlFor="search" className="text-sm text-muted-foreground mb-2 block">
                  Search Headlines
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by title or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-input border-border"
                  />
                </div>
              </div>

              {categories.length > 0 && (
                <div className="w-full md:w-48">
                  <Label htmlFor="category" className="text-sm text-muted-foreground mb-2 block">
                    Category
                  </Label>
                  <Select value={selectedCategory || "all"} onValueChange={(value) => setSelectedCategory(value === "all" ? null : value)}>
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">All categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                variant="outline"
                onClick={handleSelectAll}
                className="border-border hover:bg-muted h-10"
              >
                <Filter className="w-4 h-4 mr-2" />
                {filteredHeadlines.every((h) => h.isSelected) ? "Deselect All" : "Select All"}
              </Button>

              <Button
                variant="outline"
                onClick={handleDeduplication}
                disabled={deduplicationMutation.isPending || headlines.length === 0}
                className="border-border hover:bg-muted h-10"
              >
                {deduplicationMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Flame className="w-4 h-4 mr-2" />
                )}
                Find Duplicates
              </Button>
            </div>
          </div>

          {/* Deduplication Info Banner */}
          {showDeduplication && deduplicationGroups.length > 0 && (
            <Card className="bg-accent/5 border-accent">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Flame className="w-5 h-5 text-accent" />
                    <div>
                      <p className="font-medium text-foreground">
                        Found {deduplicationGroups.length} unique stories from {headlines.length} headlines
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Headlines are grouped by similarity. Heat score shows coverage from multiple sources.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeduplication(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Headlines List */}
          {filteredHeadlines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-lg font-medium">No headlines found</p>
              <p className="text-muted-foreground text-sm mt-1">
                {headlines.length === 0
                  ? "No headlines were collected from your sources. Please check your source configuration."
                  : "Try adjusting your search or filters"}
              </p>
            </div>
          ) : showDeduplication && deduplicationGroups.length > 0 ? (
            <div className="space-y-4">
              {deduplicationGroups.map((group) => {
                const groupHeadlines = headlines.filter(
                  (h) => deduplicationGroups.find(g => g.bestVersionId === h.id && g.groupId === group.groupId)
                );
                const isExpanded = expandedGroups.has(group.groupId);
                const allGroupHeadlines = headlines.filter(
                  (h) => h.id === group.bestVersionId || (isExpanded && groupHeadlines.some(gh => gh.id === h.id))
                );

                return (
                  <Card key={group.groupId} className="bg-card border-border">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Flame className="w-4 h-4 text-orange-500" />
                            <span className="text-sm font-medium text-orange-500">
                              Heat Score: {group.heatScore}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              • {group.headlineCount} {group.headlineCount === 1 ? 'source' : 'sources'}
                            </span>
                          </div>
                          <CardTitle className="text-lg">{group.topic}</CardTitle>
                        </div>
                        {group.headlineCount > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleGroupExpansion(group.groupId)}
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-4 h-4 mr-1" />
                                Hide {group.headlineCount - 1} more
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4 mr-1" />
                                Show {group.headlineCount - 1} more
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {headlines
                        .filter((h) => h.id === group.bestVersionId)
                        .map((headline) => (
                          <div
                            key={headline.id}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              headline.isSelected
                                ? "border-accent bg-accent/5"
                                : "border-border hover:border-muted-foreground"
                            }`}
                            onClick={() => handleSelectHeadline(headline.id)}
                          >
                            <div className="flex gap-4">
                              <Checkbox
                                checked={headline.isSelected}
                                onChange={() => handleSelectHeadline(headline.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="mt-1 flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-2 mb-2">
                                  <h4 className="font-medium text-foreground flex-1">{headline.title}</h4>
                                  <span className="text-xs px-2 py-1 bg-green-500/10 text-green-500 rounded whitespace-nowrap">
                                    Best Version
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground mb-3">{headline.description}</p>
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-4 text-muted-foreground">
                                    <span>{headline.source}</span>
                                    <span>•</span>
                                    <span>{formatDate(headline.publishedAt)}</span>
                                  </div>
                                  <a
                                    href={headline.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-accent hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Read more
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHeadlines.map((headline) => (
                <Card
                  key={headline.id}
                  className={`bg-card border-border cursor-pointer transition-all ${
                    headline.isSelected ? "border-accent bg-accent/5 shadow-md" : "hover:border-muted-foreground"
                  }`}
                  onClick={() => handleSelectHeadline(headline.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex gap-4">
                      <Checkbox
                        checked={headline.isSelected}
                        onChange={() => handleSelectHeadline(headline.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex flex-col gap-1">
                            {headline.matchedKeywords && (
                              <div className="flex items-center gap-1 mb-1">
                                <Bell className="w-3 h-3 text-orange-500" />
                                <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Alert Match</span>
                              </div>
                            )}
                            <CardTitle className="text-base leading-tight">{headline.title}</CardTitle>
                          </div>
                          {headline.category && (
                            <span className="text-xs px-2 py-1 bg-accent/10 text-accent rounded whitespace-nowrap flex-shrink-0">
                              {headline.category}
                            </span>
                          )}
                        </div>
                        <CardDescription className="mt-2 line-clamp-2">{headline.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-4">
                    <div className="flex items-center justify-between text-sm ml-10">
                      <div className="flex items-center gap-4 text-muted-foreground">
                        <span>{headline.source}</span>
                        <span>•</span>
                        <span>{formatDate(headline.publishedAt)}</span>
                      </div>
                      <a
                        href={headline.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-accent hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Read more
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Broader Web Search Dialog */}
          <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full border-dashed border-border hover:bg-muted">
                <Globe className="w-4 h-4 mr-2" />
                Broader Web Search
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Broader Web Search</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="search-query" className="text-sm text-muted-foreground mb-2 block">
                    Search Query
                  </Label>
                  <Input
                    id="search-query"
                    placeholder="Enter keywords or topics..."
                    value={searchQuery2}
                    onChange={(e) => setSearchQuery2(e.target.value)}
                    className="bg-input border-border"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleBroaderSearch}
                    disabled={isSearching}
                    className="flex-1"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Search
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setIsSearchOpen(false)} className="border-border">
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-4 border-t border-border bg-card/50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedCount > 0 ? (
              <span className="text-accent font-medium">{selectedCount} headlines selected</span>
            ) : (
              <span>Select headlines to continue</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleShowCostEstimate}
              disabled={selectedCount === 0}
              className="gap-2 border-border"
            >
              <DollarSign className="w-4 h-4" />
              Estimate Cost
            </Button>
            <Button
              onClick={handleContinueToCompile}
              disabled={selectedCount === 0 || updateSelectionMutation.isPending}
              className="gap-2"
            >
              {updateSelectionMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue to Compile ({selectedCount})
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Cost Estimate Dialog */}
      <Dialog open={costEstimateDialogOpen} onOpenChange={setCostEstimateDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-accent" />
              Cost Estimate
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
                  This is an estimate based on average token usage. Actual costs may vary depending on content complexity.
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
                  onClick={handleProceedToCompile}
                  disabled={updateSelectionMutation.isPending}
                  className="flex-1"
                >
                  Proceed to Compile
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
