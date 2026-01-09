import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ExternalLink, Search, ChevronRight, Filter, Globe, Loader2, Plus, X } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

interface Headline {
  id: number;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: Date;
  selected: boolean;
  category?: string;
}

export default function NewsInbox() {
  const [headlines, setHeadlines] = useState<Headline[]>([
    {
      id: 1,
      title: "OpenAI Releases GPT-5 with Multimodal Capabilities",
      description: "OpenAI announced the release of GPT-5, featuring advanced multimodal capabilities for image, video, and text processing...",
      url: "https://example.com/article1",
      source: "TechCrunch",
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      selected: false,
      category: "AI",
    },
    {
      id: 2,
      title: "Anthropic Raises $5B in Series C Funding",
      description: "Anthropic secures major funding round to accelerate AI research and safety initiatives...",
      url: "https://example.com/article2",
      source: "The Information",
      publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      selected: false,
      category: "AI",
    },
    {
      id: 3,
      title: "Google Announces New Gemini 2.0 Features",
      description: "Google unveils new features for Gemini AI model including real-time reasoning and improved code generation...",
      url: "https://example.com/article3",
      source: "Google Blog",
      publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      selected: false,
      category: "AI",
    },
    {
      id: 4,
      title: "Meta Releases Open-Source AI Models",
      description: "Meta releases new open-source AI models to democratize access to advanced machine learning technology...",
      url: "https://example.com/article4",
      source: "Meta Research",
      publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
      selected: false,
      category: "Open Source",
    },
    {
      id: 5,
      title: "AI Safety Researchers Publish New Alignment Framework",
      description: "Leading AI safety researchers publish groundbreaking framework for aligning AI systems with human values...",
      url: "https://example.com/article5",
      source: "arXiv",
      publishedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
      selected: false,
      category: "Research",
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery2, setSearchQuery2] = useState("");

  // Get unique categories
  const categories = Array.from(new Set(headlines.map((h) => h.category).filter(Boolean))) as string[];

  const handleSelectHeadline = (id: number) => {
    setHeadlines(
      headlines.map((h) => {
        if (h.id === id) {
          setSelectedCount(h.selected ? selectedCount - 1 : selectedCount + 1);
          return { ...h, selected: !h.selected };
        }
        return h;
      })
    );
  };

  const handleSelectAll = () => {
    const allSelected = filteredHeadlines.every((h) => h.selected);
    const newHeadlines = headlines.map((h) => {
      if (filteredHeadlines.find((fh) => fh.id === h.id)) {
        return { ...h, selected: !allSelected };
      }
      return h;
    });
    setHeadlines(newHeadlines);
    const newCount = newHeadlines.filter((h) => h.selected).length;
    setSelectedCount(newCount);
  };

  const handleBroaderSearch = async () => {
    if (!searchQuery2.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setIsSearching(true);
    try {
      // TODO: Call API to perform broader web search
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock new headlines from search
      const newHeadlines: Headline[] = [
        {
          id: headlines.length + 1,
          title: `Search result for "${searchQuery2}" - Article 1`,
          description: "This is a search result from broader web search...",
          url: "https://example.com/search-result-1",
          source: "Web Search",
          publishedAt: new Date(),
          selected: false,
          category: "Search Result",
        },
        {
          id: headlines.length + 2,
          title: `Search result for "${searchQuery2}" - Article 2`,
          description: "Another relevant article from broader web search...",
          url: "https://example.com/search-result-2",
          source: "Web Search",
          publishedAt: new Date(),
          selected: false,
          category: "Search Result",
        },
      ];

      setHeadlines([...headlines, ...newHeadlines]);
      setIsSearchOpen(false);
      setSearchQuery2("");
      toast.success(`Added ${newHeadlines.length} new headlines from web search`);
    } catch (error) {
      toast.error("Failed to perform web search");
    } finally {
      setIsSearching(false);
    }
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
                {filteredHeadlines.every((h) => h.selected) ? "Deselect All" : "Select All"}
              </Button>
            </div>
          </div>

          {/* Headlines List */}
          {filteredHeadlines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-lg font-medium">No headlines found</p>
              <p className="text-muted-foreground text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHeadlines.map((headline) => (
                <Card
                  key={headline.id}
                  className={`bg-card border-border cursor-pointer transition-all ${
                    headline.selected ? "border-accent bg-accent/5 shadow-md" : "hover:border-muted-foreground"
                  }`}
                  onClick={() => handleSelectHeadline(headline.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex gap-4">
                      <Checkbox
                        checked={headline.selected}
                        onChange={() => handleSelectHeadline(headline.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <CardTitle className="text-base leading-tight">{headline.title}</CardTitle>
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
                  <CardContent>
                    <div className="flex justify-between items-center text-xs text-muted-foreground flex-wrap gap-2">
                      <div className="flex gap-3">
                        <span className="font-medium">{headline.source}</span>
                        <span>{formatDate(headline.publishedAt)}</span>
                      </div>
                      <a
                        href={headline.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:text-accent/80 flex items-center gap-1"
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
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-8 py-6 border-t border-border flex justify-between items-center gap-4 flex-wrap">
        <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-border hover:bg-muted">
              <Globe className="w-4 h-4 mr-2" />
              Broader Web Search
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Search for Additional Headlines</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="webSearch" className="text-sm font-medium text-foreground mb-2 block">
                  Search Query
                </Label>
                <Input
                  id="webSearch"
                  placeholder="Enter search terms (e.g., 'AI breakthroughs 2026')"
                  value={searchQuery2}
                  onChange={(e) => setSearchQuery2(e.target.value)}
                  className="bg-input border-border"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isSearching) {
                      handleBroaderSearch();
                    }
                  }}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsSearchOpen(false)}
                  className="border-border hover:bg-muted"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBroaderSearch}
                  disabled={isSearching || !searchQuery2.trim()}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Headlines
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Link href="/compile">
          <Button
            disabled={selectedCount === 0}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            Continue to Compile ({selectedCount})
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
