import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, Check, AlertCircle, TrendingUp, ThumbsUp, ThumbsDown } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function Sources() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "rss" as "rss" | "gmail" | "youtube" | "website",
    config: {
      url: "",
      label: "",
      channelId: "",
      selectors: {
        title: "",
        description: "",
        link: "",
      },
    },
    topics: "",
  });

  const { data: sources, isLoading, refetch } = trpc.sources.getSources.useQuery();
  const createSource = trpc.sources.createSource.useMutation();
  const deleteSource = trpc.sources.deleteSource.useMutation();
  const testConnection = trpc.sources.testConnection.useMutation();
  const updateRating = trpc.sources.updateRating.useMutation();

  const handleAddSource = async () => {
    if (!formData.name) {
      toast.error("Please enter a source name");
      return;
    }

    try {
      // Build config based on source type
      let config: Record<string, unknown> = {};
      
      if (formData.type === "rss") {
        if (!formData.config.url) {
          toast.error("Please enter an RSS feed URL");
          return;
        }
        config = { url: formData.config.url };
      } else if (formData.type === "gmail") {
        if (!formData.config.label) {
          toast.error("Please enter a Gmail label");
          return;
        }
        config = { label: formData.config.label };
      } else if (formData.type === "youtube") {
        if (!formData.config.channelId) {
          toast.error("Please enter a YouTube channel ID");
          return;
        }
        config = { channelId: formData.config.channelId };
      } else if (formData.type === "website") {
        if (!formData.config.url) {
          toast.error("Please enter a website URL");
          return;
        }
        config = {
          url: formData.config.url,
          selectors: formData.config.selectors,
        };
      }

      await createSource.mutateAsync({
        name: formData.name,
        type: formData.type,
        config,
        topics: formData.topics.split(",").map((t) => t.trim()).filter(Boolean),
      });

      toast.success(`Source "${formData.name}" created successfully`);
      setFormData({
        name: "",
        type: "rss",
        config: {
          url: "",
          label: "",
          channelId: "",
          selectors: { title: "", description: "", link: "" },
        },
        topics: "",
      });
      setIsAddDialogOpen(false);
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create source");
    }
  };

  const handleDeleteSource = async (id: string, name: string) => {
    if (!confirm(`Delete source "${name}"?`)) {
      return;
    }

    try {
      await deleteSource.mutateAsync({ id });
      toast.success("Source deleted");
      refetch();
    } catch (error) {
      toast.error("Failed to delete source");
    }
  };

  const handleTestConnection = async (id: string, name: string) => {
    try {
      toast.info(`Testing connection to "${name}"...`);
      const result = await testConnection.mutateAsync({ id });
      
      if (result.success) {
        toast.success(`Connection successful! Found ${result.itemCount} items`);
      } else {
        toast.error(`Connection failed: ${result.error}`);
      }
    } catch (error) {
      toast.error("Failed to test connection");
    }
  };

  const handleUpdateRating = async (sourceId: string, sourceName: string, rating: -1 | 0 | 1) => {
    try {
      await updateRating.mutateAsync({ id: sourceId, rating });
      toast.success(`Rating updated for "${sourceName}"`);
      refetch();
    } catch (error) {
      toast.error("Failed to update rating");
    }
  };

  const getQualityBadge = (score: number | null) => {
    if (score === null) return <Badge variant="secondary">No data</Badge>;
    
    if (score >= 80) {
      return <Badge className="bg-green-600">Excellent ({score})</Badge>;
    } else if (score >= 60) {
      return <Badge className="bg-blue-600">Good ({score})</Badge>;
    } else if (score >= 40) {
      return <Badge className="bg-yellow-600">Average ({score})</Badge>;
    } else {
      return <Badge className="bg-red-600">Poor ({score})</Badge>;
    }
  };

  const sourceTypeLabels = {
    rss: "RSS Feed",
    gmail: "Gmail Newsletter",
    youtube: "YouTube Channel",
    website: "Website",
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
          <h1 className="text-3xl font-bold">News Sources</h1>
          <p className="text-muted-foreground mt-2">
            Manage your trusted news sources and configure topics
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Source
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add News Source</DialogTitle>
              <DialogDescription>
                Configure a new source to collect headlines from
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Source Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., TechCrunch"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Source Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, type: value as typeof formData.type })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rss">RSS Feed</SelectItem>
                      <SelectItem value="gmail">Gmail Newsletter</SelectItem>
                      <SelectItem value="youtube">YouTube Channel</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* RSS Config */}
              {formData.type === "rss" && (
                <div className="space-y-2">
                  <Label htmlFor="url">RSS Feed URL</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://example.com/feed.xml"
                    value={formData.config.url}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, url: e.target.value },
                      })
                    }
                  />
                </div>
              )}

              {/* Gmail Config */}
              {formData.type === "gmail" && (
                <div className="space-y-2">
                  <Label htmlFor="label">Gmail Label</Label>
                  <Input
                    id="label"
                    placeholder="e.g., Newsletters/Tech"
                    value={formData.config.label}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, label: e.target.value },
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Emails with this label will be fetched
                  </p>
                </div>
              )}

              {/* YouTube Config */}
              {formData.type === "youtube" && (
                <div className="space-y-2">
                  <Label htmlFor="channelId">YouTube Channel ID</Label>
                  <Input
                    id="channelId"
                    placeholder="e.g., UC_x5XG1OV2P6uZZ5FSM9Ttw"
                    value={formData.config.channelId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, channelId: e.target.value },
                      })
                    }
                  />
                </div>
              )}

              {/* Website Config */}
              {formData.type === "website" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="website-url">Website URL</Label>
                    <Input
                      id="website-url"
                      type="url"
                      placeholder="https://example.com/news"
                      value={formData.config.url}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          config: { ...formData.config, url: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CSS Selectors (Optional)</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder="Title selector"
                        value={formData.config.selectors.title}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            config: {
                              ...formData.config,
                              selectors: { ...formData.config.selectors, title: e.target.value },
                            },
                          })
                        }
                      />
                      <Input
                        placeholder="Description selector"
                        value={formData.config.selectors.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            config: {
                              ...formData.config,
                              selectors: {
                                ...formData.config.selectors,
                                description: e.target.value,
                              },
                            },
                          })
                        }
                      />
                      <Input
                        placeholder="Link selector"
                        value={formData.config.selectors.link}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            config: {
                              ...formData.config,
                              selectors: { ...formData.config.selectors, link: e.target.value },
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="topics">Topics (comma-separated)</Label>
                <Textarea
                  id="topics"
                  placeholder="e.g., artificial intelligence, machine learning, robotics"
                  value={formData.topics}
                  onChange={(e) => setFormData({ ...formData, topics: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Optional: Filter headlines by these topics
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddSource} disabled={createSource.isPending}>
                {createSource.isPending ? "Adding..." : "Add Source"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!sources || sources.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Sources Configured</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add your first news source to start collecting headlines
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Source
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sources.map((source: any) => (
            <Card key={source.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">{source.name}</CardTitle>
                      <Badge variant="outline">{sourceTypeLabels[source.type as keyof typeof sourceTypeLabels]}</Badge>
                      {source.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    
                    <CardDescription className="space-y-2">
                      {source.topics && source.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {source.topics.map((topic: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {/* Quality Score Section */}
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          <span className="text-sm font-medium">Quality Score:</span>
                          {getQualityBadge(source.qualityScore)}
                        </div>
                        
                        {/* Detailed Metrics */}
                        {source.totalHeadlines > 0 && (
                          <div className="grid grid-cols-3 gap-3 text-xs">
                            <div className="flex flex-col">
                              <span className="text-muted-foreground">Total</span>
                              <span className="font-semibold">{source.totalHeadlines}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-muted-foreground">Selected</span>
                              <span className="font-semibold">{source.selectedHeadlines} ({source.selectionRate}%)</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-muted-foreground">Final</span>
                              <span className="font-semibold">{source.finalHeadlines} ({source.finalRate}%)</span>
                            </div>
                          </div>
                        )}
                        
                        {/* User Rating Buttons */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Your rating:</span>
                          <div className="flex gap-1">
                            <Button
                              variant={source.userRating === 1 ? "default" : "outline"}
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => handleUpdateRating(source.id, source.name, source.userRating === 1 ? 0 : 1)}
                              disabled={updateRating.isPending}
                            >
                              <ThumbsUp className="w-3 h-3" />
                            </Button>
                            <Button
                              variant={source.userRating === -1 ? "destructive" : "outline"}
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => handleUpdateRating(source.id, source.name, source.userRating === -1 ? 0 : -1)}
                              disabled={updateRating.isPending}
                            >
                              <ThumbsDown className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestConnection(source.id, source.name)}
                      disabled={testConnection.isPending}
                    >
                      Test
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteSource(source.id, source.name)}
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
          <CardTitle>Source Types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p><strong>RSS Feed:</strong> Automatically fetch headlines from RSS/Atom feeds</p>
          <p><strong>Gmail Newsletter:</strong> Extract headlines from email newsletters with a specific label</p>
          <p><strong>YouTube Channel:</strong> Collect video titles and descriptions from YouTube channels</p>
          <p><strong>Website:</strong> Scrape headlines from any website using CSS selectors</p>
        </CardContent>
      </Card>
    </div>
  );
}
