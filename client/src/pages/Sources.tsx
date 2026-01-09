import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function Sources() {
  const [sources, setSources] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "rss",
    url: "",
    topics: "",
  });

  const handleAddSource = () => {
    if (formData.name && formData.url) {
      setSources([
        ...sources,
        {
          id: Date.now(),
          ...formData,
          topics: formData.topics.split(",").map((t) => t.trim()),
        },
      ]);
      setFormData({ name: "", type: "rss", url: "", topics: "" });
      setIsOpen(false);
    }
  };

  const handleDeleteSource = (id: number) => {
    setSources(sources.filter((s) => s.id !== id));
  };

  const sourceTypeLabels = {
    rss: "RSS Feed",
    gmail: "Gmail Newsletter",
    youtube: "YouTube Channel",
    website: "Website",
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-border flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">News Sources</h1>
          <p className="text-muted-foreground mt-1">Configure your trusted news sources</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Plus className="w-5 h-5 mr-2" />
              Add Source
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Add New Source</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Source Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., TechCrunch"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
              <div>
                <Label htmlFor="type">Source Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="rss">RSS Feed</SelectItem>
                    <SelectItem value="gmail">Gmail Newsletter</SelectItem>
                    <SelectItem value="youtube">YouTube Channel</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="url">URL / Channel ID</Label>
                <Input
                  id="url"
                  placeholder="https://example.com/feed or channel ID"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
              <div>
                <Label htmlFor="topics">Topics (comma-separated)</Label>
                <Input
                  id="topics"
                  placeholder="AI, Startups, Technology"
                  value={formData.topics}
                  onChange={(e) => setFormData({ ...formData, topics: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
              <Button onClick={handleAddSource} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                <Check className="w-4 h-4 mr-2" />
                Add Source
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-muted-foreground space-y-2">
              <p className="text-lg font-medium">No sources configured yet</p>
              <p className="text-sm">Add your first news source to get started</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {sources.map((source) => (
              <Card key={source.id} className="bg-card border-border">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{source.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {sourceTypeLabels[source.type as keyof typeof sourceTypeLabels]}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive/80"
                        onClick={() => handleDeleteSource(source.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">URL</p>
                    <p className="text-sm text-foreground break-all">{source.url}</p>
                  </div>
                  {source.topics.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Topics</p>
                      <div className="flex flex-wrap gap-2">
                        {source.topics.map((topic: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
