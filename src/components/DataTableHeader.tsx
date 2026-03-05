import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, FileDown } from "lucide-react";
import { useState } from "react";

interface DataTableHeaderProps {
  searchPlaceholder?: string;
  onSearch: (query: string) => void;
  onExport?: () => void;
}

export function DataTableHeader({ searchPlaceholder = "Search...", onSearch, onExport }: DataTableHeaderProps) {
  const [query, setQuery] = useState("");

  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => { setQuery(e.target.value); onSearch(e.target.value); }}
          className="pl-9"
        />
      </div>
      {onExport && (
        <Button variant="outline" size="sm" onClick={onExport}>
          <FileDown className="h-4 w-4 mr-2" /> Export PDF
        </Button>
      )}
    </div>
  );
}
