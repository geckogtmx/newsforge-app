import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ExternalLink, Search, ChevronRight } from "lucide-react";
import { Link } from "wouter";

export default function NewsInbox() {
  const [headlines, setHeadlines] = useState<any[]>([
    {
      id: 1,
      title: "OpenAI Releases GPT-5 with Multimodal Capabilities",
      description: "OpenAI announced the release of GPT-5, featuring advanced multimodal capabilities...",
      url: "https://example.com/article1",
      source: "TechCrunch",
      publishedAt: new Date(),
      selected: false,
    },
    {
      id: 2,
      title: "Anthropic Raises $5B in Series C Funding",
      description: "Anthropic secures major funding round to accelerate AI research...",
      url: "https://example.com/article2",
      source: "The Information",
      publishedAt: new Date(),
      selected: false,
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);

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
    const allSelected = headlines.every((h) => h.selected);
    setHeadlines(headlines.map((h) => ({ ...h, selected: !allSelected })));
    setSelectedCount(allSelected ? 0 : headlines.length);
  };

  const filteredHeadlines = headlines.filter(
    (h) =>
      h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-border">
        <h1 className="text-3xl font-bold text-foreground">News Inbox</h1>
        <p className="text-muted-foreground mt-1">
          {headlines.length} headlines collected • {selectedCount} selected
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="space-y-4">
          {/* Search and Actions */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search headlines..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-input border-border"
              />
            </div>
            <Button
              variant="outline"
              onClick={handleSelectAll}
              className="border-border hover:bg-muted"
            >
              {headlines.every((h) => h.selected) ? "Deselect All" : "Select All"}
            </Button>
          </div>

          {/* Headlines List */}
          {filteredHeadlines.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No headlines found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHeadlines.map((headline) => (
                <Card
                  key={headline.id}
                  className={`bg-card border-border cursor-pointer transition-colors ${
                    headline.selected ? "border-accent bg-accent/5" : "hover:border-muted-foreground"
                  }`}
                  onClick={() => handleSelectHeadline(headline.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex gap-4">
                      <Checkbox
                        checked={headline.selected}
                        onChange={() => handleSelectHeadline(headline.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <CardTitle className="text-base">{headline.title}</CardTitle>
                        <CardDescription className="mt-2 line-clamp-2">
                          {headline.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>{headline.source}</span>
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
      <div className="px-8 py-6 border-t border-border flex justify-between items-center">
        <Button variant="outline" className="border-border hover:bg-muted">
          Broader Web Search
        </Button>
        <Link href="/compile">
          <a>
            <Button
              disabled={selectedCount === 0}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              Continue to Compile
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </a>
        </Link>
      </div>
    </div>
  );
}
