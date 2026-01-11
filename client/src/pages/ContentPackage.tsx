import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronRight, Copy, Loader2, FileText, RefreshCw, AlertCircle, Check, Download } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ContentPackage() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split("?")[1]);
  const runId = searchParams.get("runId") || "";

  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [regeneratingAsset, setRegeneratingAsset] = useState<{
    packageId: string;
    assetType: "title" | "description" | "scriptOutline";
  } | null>(null);
  const [regenerateInstructions, setRegenerateInstructions] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Fetch content packages for this run
  const { data: packages = [], isLoading, error, refetch } = trpc.youtube.getPackages.useQuery(
    { runId },
    { enabled: !!runId }
  );

  const generateAssets = trpc.youtube.generateAssets.useMutation({
    onSuccess: () => {
      toast.success("YouTube assets generated successfully");
      refetch();
      setGenerating(false);
    },
    onError: (error) => {
      toast.error(`Failed to generate assets: ${error.message}`);
      setGenerating(false);
    },
  });

  const exportRun = trpc.export.exportRun.useMutation({
    onSuccess: (result) => {
      toast.success(`Exported ${result.totalExported} items to Obsidian`);
      setExporting(false);
    },
    onError: (error) => {
      toast.error(`Export failed: ${error.message}`);
      setExporting(false);
    },
  });

  const regenerateAsset = trpc.youtube.regenerateAsset.useMutation({
    onSuccess: () => {
      toast.success("Asset regenerated successfully");
      refetch();
      setRegeneratingAsset(null);
      setDialogOpen(false);
      setRegenerateInstructions("");
    },
    onError: (error) => {
      toast.error(`Failed to regenerate: ${error.message}`);
      setRegeneratingAsset(null);
    },
  });

  const updateAsset = trpc.youtube.updateAsset.useMutation({
    onSuccess: () => {
      toast.success("Asset updated");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const handleGenerateAssets = () => {
    setGenerating(true);
    generateAssets.mutate({ runId });
  };

  const handleRegenerateClick = (packageId: string, assetType: "title" | "description" | "scriptOutline") => {
    setRegeneratingAsset({ packageId, assetType });
    setDialogOpen(true);
  };

  const handleRegenerateSubmit = () => {
    if (!regeneratingAsset) return;

    regenerateAsset.mutate({
      packageId: regeneratingAsset.packageId,
      assetType: regeneratingAsset.assetType,
      instructions: regenerateInstructions || undefined,
    });
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleAssetEdit = (packageId: string, field: "youtubeTitle" | "youtubeDescription" | "scriptOutline", value: string) => {
    updateAsset.mutate({
      packageId,
      [field]: value,
    });
  };

  // Set first package as selected by default
  useEffect(() => {
    if (packages.length > 0 && !selectedPackageId) {
      setSelectedPackageId(packages[0].id);
    }
  }, [packages, selectedPackageId]);

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

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
            Failed to load content packages: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Content Package</h1>
          <p className="text-muted-foreground mt-1">
            Generate YouTube-ready assets for your compiled items
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No content packages found. Generate YouTube assets from your compiled items.
          </AlertDescription>
        </Alert>

        <div className="flex items-center gap-4">
          <Link href={`/compilation?runId=${runId}`}>
            <Button variant="outline">Back to Compilation</Button>
          </Link>
          <Button onClick={handleGenerateAssets} disabled={generating} className="gap-2">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Assets...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Generate YouTube Assets
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  const selectedPackage = packages.find((pkg) => pkg.id === selectedPackageId) || packages[0];

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Package</h1>
          <p className="text-muted-foreground mt-1">
            Review and edit YouTube-ready assets
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {packages.length} {packages.length === 1 ? "Package" : "Packages"}
          </Badge>
          <Button
            onClick={() => {
              setExporting(true);
              exportRun.mutate({ runId });
            }}
            disabled={exporting}
            className="gap-2"
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export to Obsidian
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Package List */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar - Package List */}
        <div className="md:col-span-1 space-y-2">
          <h3 className="font-semibold mb-3">Content Items</h3>
          {packages.map((pkg) => (
            <Card
              key={pkg.id}
              className={`cursor-pointer transition-all ${
                selectedPackageId === pkg.id
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/50"
              }`}
              onClick={() => setSelectedPackageId(pkg.id)}
            >
              <CardHeader className="p-4">
                <CardTitle className="text-sm">{pkg.compiledItem?.topic || "Unknown Topic"}</CardTitle>
                <CardDescription className="text-xs line-clamp-2">
                  {pkg.compiledItem?.hook || ""}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Main Content - Selected Package */}
        <div className="md:col-span-3 space-y-4">
          {selectedPackage && (
            <>
              {/* Package Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl">{selectedPackage.compiledItem?.topic}</CardTitle>
                      <CardDescription className="mt-2">
                        {selectedPackage.compiledItem?.hook}
                      </CardDescription>
                    </div>
                    <Badge variant={selectedPackage.status === "ready" ? "default" : "secondary"}>
                      {selectedPackage.status}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>

              {/* YouTube Assets Tabs */}
              <Tabs defaultValue="title" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="title">Title</TabsTrigger>
                  <TabsTrigger value="description">Description</TabsTrigger>
                  <TabsTrigger value="script">Script Outline</TabsTrigger>
                </TabsList>

                {/* Title Tab */}
                <TabsContent value="title" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>YouTube Title</CardTitle>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyToClipboard(selectedPackage.youtubeTitle || "", "Title")}
                            className="gap-2"
                          >
                            <Copy className="h-4 w-4" />
                            Copy
                          </Button>
                          <Dialog open={dialogOpen && regeneratingAsset?.assetType === "title"} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRegenerateClick(selectedPackage.id, "title")}
                                disabled={regenerateAsset.isPending}
                                className="gap-2"
                              >
                                {regenerateAsset.isPending && regeneratingAsset?.assetType === "title" ? (
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
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Regenerate Title</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Textarea
                                  placeholder="Provide instructions for regenerating the title (optional)..."
                                  value={regenerateInstructions}
                                  onChange={(e) => setRegenerateInstructions(e.target.value)}
                                  rows={4}
                                />
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleRegenerateSubmit}>Regenerate</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={selectedPackage.youtubeTitle || ""}
                        onChange={(e) => handleAssetEdit(selectedPackage.id, "youtubeTitle", e.target.value)}
                        rows={2}
                        className="font-medium text-lg"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        {(selectedPackage.youtubeTitle || "").length} / 100 characters
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Description Tab */}
                <TabsContent value="description" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>YouTube Description</CardTitle>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyToClipboard(selectedPackage.youtubeDescription || "", "Description")}
                            className="gap-2"
                          >
                            <Copy className="h-4 w-4" />
                            Copy
                          </Button>
                          <Dialog open={dialogOpen && regeneratingAsset?.assetType === "description"} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRegenerateClick(selectedPackage.id, "description")}
                                disabled={regenerateAsset.isPending}
                                className="gap-2"
                              >
                                {regenerateAsset.isPending && regeneratingAsset?.assetType === "description" ? (
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
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Regenerate Description</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Textarea
                                  placeholder="Provide instructions for regenerating the description (optional)..."
                                  value={regenerateInstructions}
                                  onChange={(e) => setRegenerateInstructions(e.target.value)}
                                  rows={4}
                                />
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleRegenerateSubmit}>Regenerate</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={selectedPackage.youtubeDescription || ""}
                        onChange={(e) => handleAssetEdit(selectedPackage.id, "youtubeDescription", e.target.value)}
                        rows={12}
                        className="font-mono text-sm"
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Script Outline Tab */}
                <TabsContent value="script" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Script Outline</CardTitle>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyToClipboard(selectedPackage.scriptOutline || "", "Script Outline")}
                            className="gap-2"
                          >
                            <Copy className="h-4 w-4" />
                            Copy
                          </Button>
                          <Dialog open={dialogOpen && regeneratingAsset?.assetType === "scriptOutline"} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRegenerateClick(selectedPackage.id, "scriptOutline")}
                                disabled={regenerateAsset.isPending}
                                className="gap-2"
                              >
                                {regenerateAsset.isPending && regeneratingAsset?.assetType === "scriptOutline" ? (
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
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Regenerate Script Outline</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Textarea
                                  placeholder="Provide instructions for regenerating the script outline (optional)..."
                                  value={regenerateInstructions}
                                  onChange={(e) => setRegenerateInstructions(e.target.value)}
                                  rows={4}
                                />
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleRegenerateSubmit}>Regenerate</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={selectedPackage.scriptOutline || ""}
                        onChange={(e) => handleAssetEdit(selectedPackage.id, "scriptOutline", e.target.value)}
                        rows={12}
                        className="font-mono text-sm"
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Bottom Action Bar */}
              <div className="flex items-center justify-between bg-card border rounded-lg p-4 sticky bottom-4">
                <Link href={`/compilation?runId=${runId}`}>
                  <Button variant="outline">Back to Compilation</Button>
                </Link>
                <Button className="gap-2">
                  Export to Obsidian
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
