import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Download, Eye, Calendar, TrendingUp, Zap, Play } from "lucide-react";

interface ArchivedRun {
  id: number;
  date: Date;
  status: "completed" | "archived";
  itemsCollected: number;
  itemsCompiled: number;
  contentItemsCreated: number;
  tokensUsed: number;
  obsidianExportPath?: string;
}

export default function Archive() {
  // TODO: Replace with real data from API
  const [runs, setRuns] = useState<ArchivedRun[]>([
    {
      id: 1,
      date: new Date("2026-01-09"),
      status: "archived",
      itemsCollected: 42,
      itemsCompiled: 28,
      contentItemsCreated: 12,
      tokensUsed: 15234,
      obsidianExportPath: "/Users/gecko/Obsidian/NewsForge/2026-01-09",
    },
    {
      id: 2,
      date: new Date("2026-01-08"),
      status: "archived",
      itemsCollected: 38,
      itemsCompiled: 25,
      contentItemsCreated: 10,
      tokensUsed: 13456,
      obsidianExportPath: "/Users/gecko/Obsidian/NewsForge/2026-01-08",
    },
    {
      id: 3,
      date: new Date("2026-01-07"),
      status: "archived",
      itemsCollected: 45,
      itemsCompiled: 32,
      contentItemsCreated: 14,
      tokensUsed: 18234,
      obsidianExportPath: "/Users/gecko/Obsidian/NewsForge/2026-01-07",
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [selectedRun, setSelectedRun] = useState<ArchivedRun | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Filter runs by search query
  const filteredRuns = runs.filter((run) =>
    run.date.toLocaleDateString().includes(searchQuery) ||
    run.obsidianExportPath?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort runs
  const sortedRuns = [...filteredRuns].sort((a, b) => {
    switch (sortBy) {
      case "date-desc":
        return b.date.getTime() - a.date.getTime();
      case "date-asc":
        return a.date.getTime() - b.date.getTime();
      case "items-desc":
        return b.contentItemsCreated - a.contentItemsCreated;
      case "items-asc":
        return a.contentItemsCreated - b.contentItemsCreated;
      default:
        return 0;
    }
  });

  const handleViewDetails = (run: ArchivedRun) => {
    setSelectedRun(run);
    setIsDetailOpen(true);
  };

  const handleDownload = (run: ArchivedRun) => {
    // TODO: Implement download functionality
    console.log("Downloading run:", run.id);
  };

  const handleRestore = (run: ArchivedRun) => {
    // TODO: Implement restore functionality
    console.log("Restoring run:", run.id);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-border">
        <h1 className="text-3xl font-bold text-foreground">Run Archive</h1>
        <p className="text-muted-foreground mt-1">Browse and manage your previous compilation runs</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="space-y-6">
          {/* Filters & Search */}
          <div className="flex gap-4 flex-col md:flex-row md:items-end">
            <div className="flex-1">
              <Label htmlFor="search" className="text-sm text-muted-foreground mb-2 block">
                Search
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by date or path..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-input border-border"
                />
              </div>
            </div>

            <div className="w-full md:w-48">
              <Label htmlFor="sort" className="text-sm text-muted-foreground mb-2 block">
                Sort By
              </Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="date-desc">Newest First</SelectItem>
                  <SelectItem value="date-asc">Oldest First</SelectItem>
                  <SelectItem value="items-desc">Most Items</SelectItem>
                  <SelectItem value="items-asc">Least Items</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Runs List */}
          {sortedRuns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-muted-foreground space-y-2">
                <p className="text-lg font-medium">No archived runs found</p>
                <p className="text-sm">Your completed runs will appear here</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedRuns.map((run) => (
                <Card key={run.id} className="bg-card border-border hover:border-muted-foreground transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-accent" />
                          {run.date.toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {run.obsidianExportPath && (
                            <span className="text-xs text-muted-foreground break-all">{run.obsidianExportPath}</span>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Dialog open={isDetailOpen && selectedRun?.id === run.id} onOpenChange={setIsDetailOpen}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() => handleViewDetails(run)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-card border-border max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Run Details - {run.date.toLocaleDateString()}</DialogTitle>
                            </DialogHeader>
                            {selectedRun && (
                              <div className="space-y-6">
                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">Items Collected</p>
                                    <p className="text-2xl font-bold text-foreground">{selectedRun.itemsCollected}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">Items Compiled</p>
                                    <p className="text-2xl font-bold text-foreground">{selectedRun.itemsCompiled}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">Content Items</p>
                                    <p className="text-2xl font-bold text-foreground">{selectedRun.contentItemsCreated}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">Tokens Used</p>
                                    <p className="text-2xl font-bold text-foreground">
                                      {selectedRun.tokensUsed.toLocaleString()}
                                    </p>
                                  </div>
                                </div>

                                {/* Export Path */}
                                {selectedRun.obsidianExportPath && (
                                  <div className="space-y-2">
                                    <p className="text-sm font-medium text-foreground">Obsidian Export Path</p>
                                    <p className="text-xs text-muted-foreground break-all">
                                      {selectedRun.obsidianExportPath}
                                    </p>
                                  </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2 pt-4">
                                  <Button
                                    variant="outline"
                                    className="flex-1 border-border hover:bg-muted"
                                    onClick={() => handleDownload(selectedRun)}
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download
                                  </Button>
                                  <Button
                                    className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                                    onClick={() => handleRestore(selectedRun)}
                                  >
                                    <Play className="w-4 h-4 mr-2" />
                                    Restore
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => handleDownload(run)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-400" />
                        <div>
                          <p className="text-xs text-muted-foreground">Collected</p>
                          <p className="text-sm font-medium text-foreground">{run.itemsCollected}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-green-400" />
                        <div>
                          <p className="text-xs text-muted-foreground">Compiled</p>
                          <p className="text-sm font-medium text-foreground">{run.itemsCompiled}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Play className="w-4 h-4 text-purple-400" />
                        <div>
                          <p className="text-xs text-muted-foreground">Content</p>
                          <p className="text-sm font-medium text-foreground">{run.contentItemsCreated}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-orange-400 rounded" />
                        <div>
                          <p className="text-xs text-muted-foreground">Tokens</p>
                          <p className="text-sm font-medium text-foreground">{(run.tokensUsed / 1000).toFixed(1)}k</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
