import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Pagination } from "@/components/common/Pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listActivity } from "@/services/activity";
import { queryKeys } from "@/lib/queryKeys";
import { ACTIVITY_LABELS, ADMIN_PAGE_SIZE } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const RESOURCE_TYPES = [
  { value: "all", label: "Everything" },
  { value: "song", label: "Songs" },
  { value: "announcement", label: "Announcements" },
  { value: "user", label: "Members" },
  { value: "voice_classification", label: "Voice parts" },
  { value: "voice_request", label: "Voice part requests" },
  { value: "setting", label: "Settings" },
  { value: "auth", label: "Sign-ins" },
];

export default function AdminActivity() {
  useDocumentTitle("Activity log");
  const [resourceType, setResourceType] = React.useState("all");
  const [page, setPage] = React.useState(1);

  const params = {
    resourceType: resourceType === "all" ? null : resourceType,
    page,
    pageSize: ADMIN_PAGE_SIZE,
  };
  const query = useQuery({
    queryKey: queryKeys.activity(params),
    queryFn: () => listActivity(params),
    placeholderData: (previous) => previous,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="System"
        title="Activity log"
        description="Written by the database itself, so administrative changes can't be made off the record. The log is read-only."
      />

      <div className="flex flex-wrap gap-3">
        <Select
          value={resourceType}
          onValueChange={(value) => {
            setResourceType(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-56" aria-label="Filter by type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RESOURCE_TYPES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {query.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : query.isError ? (
        <ErrorState title="The activity log didn't load" error={query.error} onRetry={query.refetch} />
      ) : query.data?.rows.length ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.rows.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(entry.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ACTIVITY_LABELS[entry.action] ?? entry.action}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[22ch] truncate">{entry.resource_label ?? "—"}</TableCell>
                    <TableCell className="max-w-[24ch] truncate text-muted-foreground">
                      {entry.actor_email ?? "System"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <EmptyState icon={<Activity />} title="Nothing logged yet" description="Administrative changes will appear here." />
      )}

      <Pagination
        page={page}
        pageSize={ADMIN_PAGE_SIZE}
        total={query.data?.total ?? 0}
        onPageChange={setPage}
        label="entries"
      />
    </div>
  );
}
