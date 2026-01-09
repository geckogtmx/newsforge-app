import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronRight, Edit2, Copy, Download, Loader2, Play, FileText } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

interface ContentAsset {
  id: number;
  topic: string;
  youtubeTitle: string;
  youtubeDescription: string;
  scriptOutline: string;
  status: "generated" | "editing" | "finalized";
  isRegenerating?: boolean;
}

export default function ContentPackage() {
  const [assets, setAssets] = useState<ContentAsset[]>([
    {
      id: 1,
      topic: "GPT-5 Release",
      youtubeTitle: "OpenAI's GPT-5: The AI Revolution Continues",
      youtubeDescription:
        "OpenAI has just released GPT-5, featuring groundbreaking multimodal capabilities. In this video, we break down what makes GPT-5 special, how it compares to GPT-4, and what it means for the future of AI.\n\n⏱️ Timestamps:\n0:00 - Introduction\n0:45 - What is GPT-5?\n2:30 - Key Features\n5:00 - Performance Benchmarks\n7:15 - Real-world Applications\n9:30 - Conclusion\n\n📚 Resources:\n- OpenAI Blog: [link]\n- Technical Paper: [link]",
      scriptOutline:
        "1. Hook (0-5s): Start with impressive GPT-5 demo\n2. What is GPT-5 (45s-2:30): Explain multimodal capabilities\n3. Key Features (2:30-5:00): Deep dive into new features\n4. Performance (5:00-7:15): Show benchmark comparisons\n5. Applications (7:15-9:30): Real-world use cases\n6. Conclusion (9:30-10:00): Call to action and subscribe",
      status: "generated",
    },
    {
      id: 2,
      topic: "AI Funding Surge",
      youtubeTitle: "AI Companies Raise $100B+ in 2026 - What's Happening?",
      youtubeDescription:
        "The AI funding landscape is exploding. Anthropic just raised $5B, and the total AI funding for 2026 is projected to exceed $100B. We explore what's driving this investment surge and what it means for the future of AI development.\n\n⏱️ Timestamps:\n0:00 - Introduction\n0:30 - The Numbers\n2:00 - Anthropic's Funding\n4:00 - Why the Surge?\n6:30 - Market Implications\n8:00 - Conclusion",
      scriptOutline:
        "1. Hook (0-5s): Show funding statistics\n2. The Numbers (30s-2:00): Explain funding trends\n3. Anthropic Case (2:00-4:00): Focus on their $5B raise\n4. Why Surge (4:00-6:30): Market drivers and competition\n5. Implications (6:30-8:00): What this means for AI\n6. Conclusion (8:00-8:30): Summary and call to action",
      status: "generated",
    },
    {
      id: 3,
      topic: "Open Source AI",
      youtubeTitle: "Meta's Open-Source AI Models: A Game Changer",
      youtubeDescription:
        "Meta is democratizing AI by releasing open-source models. Learn how this move could reshape the AI landscape and what it means for developers and researchers worldwide.",
      scriptOutline:
        "1. Hook (0-5s): Show Meta announcement\n2. What's Being Released (30s-2:00): Overview of models\n3. Why It Matters (2:00-5:00): Impact on AI community\n4. How to Use (5:00-7:00): Getting started guide\n5. Implications (7:00-9:00): Future of open-source AI\n6. Conclusion (9:00-10:00): Call to action",
      status: "generated",
    },
  ]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<ContentAsset>>({});
  const [selectedAsset, setSelectedAsset] = useState<ContentAsset | null>(assets[0]);

  const handleEditStart = (asset: ContentAsset) => {
    setEditingId(asset.id);
    setEditValues({ ...asset });
  };

  const handleEditSave = () => {
    if (editingId && editValues.id === editingId) {
      setAssets(
        assets.map((asset) => (asset.id === editingId ? { ...asset, ...editValues } : asset))
      );
      if (selectedAsset?.id === editingId) {
        setSelectedAsset({ ...selectedAsset, ...editValues });
      }
      setEditingId(null);
      setEditValues({});
      toast.success("Asset updated successfully");
    }
  };

  const handleRegenerate = async (id: number) => {
    setAssets(
      assets.map((asset) => (asset.id === id ? { ...asset, isRegenerating: true } : asset))
    );

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setAssets(
        assets.map((asset) =>
          asset.id === id
            ? {
                ...asset,
                isRegenerating: false,
                youtubeTitle: "Updated Title from LLM",
                youtubeDescription: "Updated description from LLM regeneration...",
                scriptOutline: "Updated script outline from LLM...",
              }
            : asset
        )
      );
      toast.success("Asset regenerated successfully");
    } catch (error) {
      toast.error("Failed to regenerate asset");
      setAssets(
        assets.map((asset) => (asset.id === id ? { ...asset, isRegenerating: false } : asset))
      );
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleFinalize = (id: number) => {
    setAssets(
      assets.map((asset) => (asset.id === id ? { ...asset, status: "finalized" } : asset))
    );
    if (selectedAsset?.id === id) {
      setSelectedAsset({ ...selectedAsset, status: "finalized" });
    }
    toast.success("Asset finalized");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-border">
        <h1 className="text-3xl font-bold text-foreground">Content Package</h1>
        <p className="text-muted-foreground mt-1">
          {assets.length} YouTube-ready content packages • {assets.filter((a) => a.status === "finalized").length} finalized
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assets List */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Content Assets</h3>
            <div className="space-y-2">
              {assets.map((asset) => (
                <Card
                  key={asset.id}
                  className={`bg-card border-border cursor-pointer transition-all ${
                    selectedAsset?.id === asset.id ? "border-accent bg-accent/5" : "hover:border-muted-foreground"
                  }`}
                  onClick={() => setSelectedAsset(asset)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm">{asset.topic}</CardTitle>
                      <Badge
                        variant={asset.status === "finalized" ? "default" : "outline"}
                        className={asset.status === "finalized" ? "bg-accent text-accent-foreground" : ""}
                      >
                        {asset.status === "finalized" ? "✓" : "Draft"}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          {/* Asset Details */}
          {selectedAsset && (
            <div className="lg:col-span-2 space-y-6">
              {editingId === selectedAsset.id ? (
                <div className="space-y-4">
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle>Edit Content Asset</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="title" className="text-sm font-medium text-foreground mb-2 block">
                          YouTube Title
                        </Label>
                        <Input
                          id="title"
                          value={editValues.youtubeTitle || ""}
                          onChange={(e) => setEditValues({ ...editValues, youtubeTitle: e.target.value })}
                          className="bg-input border-border"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {(editValues.youtubeTitle || "").length}/60 characters
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="description" className="text-sm font-medium text-foreground mb-2 block">
                          YouTube Description
                        </Label>
                        <Textarea
                          id="description"
                          value={editValues.youtubeDescription || ""}
                          onChange={(e) => setEditValues({ ...editValues, youtubeDescription: e.target.value })}
                          className="bg-input border-border min-h-32"
                        />
                      </div>

                      <div>
                        <Label htmlFor="script" className="text-sm font-medium text-foreground mb-2 block">
                          Script Outline
                        </Label>
                        <Textarea
                          id="script"
                          value={editValues.scriptOutline || ""}
                          onChange={(e) => setEditValues({ ...editValues, scriptOutline: e.target.value })}
                          className="bg-input border-border min-h-32 font-mono text-xs"
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
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* YouTube Title */}
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Play className="w-5 h-5 text-accent" />
                          <CardTitle>YouTube Title</CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(selectedAsset.youtubeTitle)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-medium text-foreground">{selectedAsset.youtubeTitle}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {selectedAsset.youtubeTitle.length}/60 characters
                      </p>
                    </CardContent>
                  </Card>

                  {/* YouTube Description */}
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-accent" />
                          <CardTitle>YouTube Description</CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(selectedAsset.youtubeDescription)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">
                        {selectedAsset.youtubeDescription}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Script Outline */}
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle>Script Outline</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(selectedAsset.scriptOutline)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground font-mono whitespace-pre-wrap line-clamp-8">
                        {selectedAsset.scriptOutline}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      onClick={() => handleRegenerate(selectedAsset.id)}
                      disabled={selectedAsset.isRegenerating}
                      className="border-border hover:bg-muted"
                    >
                      {selectedAsset.isRegenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <ChevronRight className="w-4 h-4 mr-2" />
                          Regenerate with LLM
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleEditStart(selectedAsset)}
                      className="border-border hover:bg-muted"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      className="border-border hover:bg-muted"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    {selectedAsset.status !== "finalized" && (
                      <Button
                        onClick={() => handleFinalize(selectedAsset.id)}
                        className="bg-accent hover:bg-accent/90 text-accent-foreground"
                      >
                        Finalize
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-8 py-6 border-t border-border flex justify-between items-center gap-4 flex-wrap">
        <Button variant="outline" className="border-border hover:bg-muted">
          Back to Compilation
        </Button>
        <Link href="/review">
          <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
            Review & Export
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
