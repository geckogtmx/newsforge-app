import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Edit2, RefreshCw, Loader2, Zap } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

interface CompiledItem {
  id: number;
  topic: string;
  hook: string;
  summary: string;
  sourceCount: number;
  selected: boolean;
  isRegenerating?: boolean;
}

export default function Compilation() {
  const [items, setItems] = useState<CompiledItem[]>([
    {
      id: 1,
      topic: "GPT-5 Release",
      hook: "OpenAI's newest model breaks new ground in multimodal AI",
      summary:
        "OpenAI has released GPT-5, featuring advanced multimodal capabilities for processing images, videos, and text. The model demonstrates significant improvements in reasoning, code generation, and creative tasks. Early benchmarks show a 40% improvement over GPT-4 in complex reasoning tasks.",
      sourceCount: 3,
      selected: false,
    },
    {
      id: 2,
      topic: "AI Funding Surge",
      hook: "Major AI companies secure billions in new funding rounds",
      summary:
        "Anthropic raised $5B in Series C funding, while other AI companies continue to attract significant investment. This funding wave reflects growing confidence in AI technology and increased competition in the space. Total AI funding in 2026 is projected to exceed $100B.",
      sourceCount: 4,
      selected: false,
    },
    {
      id: 3,
      topic: "Open Source AI",
      hook: "Meta releases open-source models to democratize AI access",
      summary:
        "Meta has released new open-source AI models, making advanced machine learning technology accessible to developers worldwide. This move aims to democratize AI and accelerate innovation in the open-source community. The models are available on Hugging Face and GitHub.",
      sourceCount: 2,
      selected: false,
    },
    {
      id: 4,
      topic: "AI Safety Research",
      hook: "New alignment framework addresses critical AI safety concerns",
      summary:
        "Leading AI safety researchers have published a groundbreaking framework for aligning AI systems with human values. The framework provides practical methods for ensuring AI systems behave in accordance with human intentions. This research is expected to influence AI development practices across the industry.",
      sourceCount: 2,
      selected: false,
    },
  ]);

  const [selectedCount, setSelectedCount] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<CompiledItem>>({});

  const handleSelectItem = (id: number) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          setSelectedCount(item.selected ? selectedCount - 1 : selectedCount + 1);
          return { ...item, selected: !item.selected };
        }
        return item;
      })
    );
  };

  const handleSelectAll = () => {
    const allSelected = items.every((item) => item.selected);
    setItems(items.map((item) => ({ ...item, selected: !allSelected })));
    setSelectedCount(allSelected ? 0 : items.length);
  };

  const handleEditStart = (item: CompiledItem) => {
    setEditingId(item.id);
    setEditValues({ ...item });
  };

  const handleEditSave = () => {
    if (editingId && editValues.id === editingId) {
      setItems(
        items.map((item) => (item.id === editingId ? { ...item, ...editValues } : item))
      );
      setEditingId(null);
      setEditValues({});
      toast.success("Item updated successfully");
    }
  };

  const handleRegenerate = async (id: number) => {
    // TODO: Call API to regenerate item
    setItems(
      items.map((item) => (item.id === id ? { ...item, isRegenerating: true } : item))
    );

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setItems(
        items.map((item) =>
          item.id === id
            ? {
                ...item,
                isRegenerating: false,
                hook: "Updated hook from LLM regeneration",
                summary: "Updated summary from LLM regeneration with improved content...",
              }
            : item
        )
      );
      toast.success("Item regenerated successfully");
    } catch (error) {
      toast.error("Failed to regenerate item");
      setItems(
        items.map((item) => (item.id === id ? { ...item, isRegenerating: false } : item))
      );
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-border">
        <h1 className="text-3xl font-bold text-foreground">Compilation Review</h1>
        <p className="text-muted-foreground mt-1">
          {items.length} compiled items • {selectedCount} selected for content package
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="space-y-6">
          {/* Info Box */}
          <Card className="bg-accent/10 border-accent/20">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <CardTitle className="text-base text-accent">AI-Powered Compilation</CardTitle>
                  <CardDescription className="text-accent/80 mt-1">
                    These items were automatically compiled and homologated from your selected headlines. Review, edit, and select the ones you want to turn into YouTube content.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Select All Button */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {items.length} items available
            </p>
            <Button
              variant="outline"
              onClick={handleSelectAll}
              className="border-border hover:bg-muted"
            >
              {items.every((item) => item.selected) ? "Deselect All" : "Select All"}
            </Button>
          </div>

          {/* Compiled Items */}
          <div className="space-y-4">
            {items.map((item) => (
              <Card
                key={item.id}
                className={`bg-card border-border transition-all ${
                  item.selected ? "border-accent bg-accent/5 shadow-md" : "hover:border-muted-foreground"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex gap-4">
                    <Checkbox
                      checked={item.selected}
                      onChange={() => handleSelectItem(item.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <CardTitle className="text-lg">{item.topic}</CardTitle>
                        <Badge variant="outline" className="border-muted-foreground text-muted-foreground flex-shrink-0">
                          {item.sourceCount} sources
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-accent mb-2">{item.hook}</p>
                      <CardDescription className="line-clamp-2 text-muted-foreground">
                        {item.summary}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {editingId === item.id ? (
                    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
                      <div>
                        <Label htmlFor={`hook-${item.id}`} className="text-sm font-medium text-foreground mb-2 block">
                          Hook
                        </Label>
                        <Input
                          id={`hook-${item.id}`}
                          value={editValues.hook || ""}
                          onChange={(e) => setEditValues({ ...editValues, hook: e.target.value })}
                          className="bg-input border-border"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`summary-${item.id}`} className="text-sm font-medium text-foreground mb-2 block">
                          Summary
                        </Label>
                        <Textarea
                          id={`summary-${item.id}`}
                          value={editValues.summary || ""}
                          onChange={(e) => setEditValues({ ...editValues, summary: e.target.value })}
                          className="bg-input border-border min-h-24"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => setEditingId(null)}
                          className="border-border hover:bg-muted"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleEditSave}
                          className="bg-accent hover:bg-accent/90 text-accent-foreground"
                        >
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRegenerate(item.id)}
                        disabled={item.isRegenerating}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {item.isRegenerating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Regenerating...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Regenerate
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditStart(item)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-8 py-6 border-t border-border flex justify-between items-center gap-4 flex-wrap">
        <Button variant="outline" className="border-border hover:bg-muted">
          Back to Inbox
        </Button>
        <Link href="/content">
          <Button
            disabled={selectedCount === 0}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            Create Content Package ({selectedCount})
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
