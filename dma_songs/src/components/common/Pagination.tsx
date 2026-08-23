import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  label?: string;
}

export function Pagination({ page, pageSize, total, onPageChange, label = "items" }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 pt-4" aria-label="Pagination">
      <p className="text-sm text-muted-foreground">
        {first}–{last} of {total} {label}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft aria-hidden /> Previous
        </Button>
        <span className="px-1 font-mono text-sm">
          {page} / {pages}
        </span>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
          Next <ChevronRight aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
