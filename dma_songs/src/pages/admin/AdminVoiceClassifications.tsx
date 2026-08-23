import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2, Waves } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Field } from "@/components/common/Field";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useVoiceClassifications } from "@/hooks/useVoiceClassifications";
import {
  createVoiceClassification, deleteVoiceClassification, updateVoiceClassification, voicePartUsage,
} from "@/services/voiceClassifications";
import {
  voiceClassificationFormSchema, type VoiceClassificationFormValues,
} from "@/schemas/voiceClassification";
import { errorMessage } from "@/lib/errors";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { VoiceClassification } from "@/types/models";

const EMPTY: VoiceClassificationFormValues = {
  name: "",
  shortCode: "",
  description: "",
  color: "#262C6B",
  sortOrder: 100,
  isActive: true,
};

export default function AdminVoiceClassifications() {
  useDocumentTitle("Voice parts");
  const queryClient = useQueryClient();
  const query = useVoiceClassifications(true);
  const [editing, setEditing] = React.useState<VoiceClassification | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<VoiceClassification | null>(null);

  const usage = useQuery({
    queryKey: ["voice-part-usage", pendingDelete?.id],
    queryFn: () => voicePartUsage(pendingDelete!.id),
    enabled: Boolean(pendingDelete),
  });

  const form = useForm<VoiceClassificationFormValues>({
    resolver: zodResolver(voiceClassificationFormSchema),
    defaultValues: EMPTY,
  });

  const open = creating || Boolean(editing);

  React.useEffect(() => {
    if (editing) {
      form.reset({
        name: editing.name,
        shortCode: editing.short_code ?? "",
        description: editing.description ?? "",
        color: editing.color,
        sortOrder: editing.sort_order,
        isActive: editing.is_active,
      });
    } else if (creating) {
      form.reset({ ...EMPTY, sortOrder: (query.data?.length ?? 0) * 10 + 10 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, creating]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["voice-classifications"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
  };

  const save = useMutation({
    mutationFn: (values: VoiceClassificationFormValues) => {
      const parsed = voiceClassificationFormSchema.parse(values);
      return editing ? updateVoiceClassification(editing.id, parsed) : createVoiceClassification(parsed);
    },
    onSuccess: () => {
      invalidate();
      toast.success(editing ? "Voice part saved" : "Voice part added");
      setEditing(null);
      setCreating(false);
    },
    onError: (error) => toast.error(errorMessage(error, "The voice part didn't save.")),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteVoiceClassification(id),
    onSuccess: () => {
      invalidate();
      setPendingDelete(null);
      toast.success("Voice part deleted");
    },
    onError: (error) => toast.error(errorMessage(error, "That voice part couldn't be deleted.")),
  });

  const inUse = (usage.data?.songs ?? 0) + (usage.data?.members ?? 0) > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="Voice parts"
        description="The parts singers can choose from. Colour and order carry through the whole app, so changes here are visible everywhere."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden /> Add voice part
          </Button>
        }
      />

      {query.isLoading ? (
        <Skeleton className="h-80 w-full" />
      ) : query.isError ? (
        <ErrorState title="Voice parts didn't load" error={query.error} onRetry={query.refetch} />
      ) : query.data?.length ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Order</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Code</TableHead>
                  <TableHead className="hidden lg:table-cell">Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.map((part) => (
                  <TableRow key={part.id}>
                    <TableCell className="font-mono text-sm text-muted-foreground">{part.sort_order}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2 font-semibold">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: part.color }}
                          aria-hidden
                        />
                        {part.name}
                      </span>
                    </TableCell>
                    <TableCell className="hidden font-mono text-sm sm:table-cell">{part.short_code}</TableCell>
                    <TableCell className="hidden max-w-[32ch] truncate text-muted-foreground lg:table-cell">
                      {part.description ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={part.is_active ? "success" : "secondary"}>
                        {part.is_active ? "Active" : "Hidden"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditing(part)}
                          aria-label={`Edit ${part.name}`}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPendingDelete(part)}
                          aria-label={`Delete ${part.name}`}
                        >
                          <Trash2 className="text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={<Waves />}
          title="No voice parts"
          description="Add the parts your ensemble sings so singers have something to choose from."
          action={<Button onClick={() => setCreating(true)}>Add voice part</Button>}
        />
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            setEditing(null);
            setCreating(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : "Add a voice part"}</DialogTitle>
            <DialogDescription>
              The colour is used for this part's chips, tabs and dashboard bars.
            </DialogDescription>
          </DialogHeader>

          <form
            id="voice-part-form"
            onSubmit={form.handleSubmit((values) => save.mutate(values))}
            className="space-y-4"
            noValidate
          >
            <Field label="Name" htmlFor="part-name" error={form.formState.errors.name?.message} required>
              <Input id="part-name" {...form.register("name")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Short code"
                htmlFor="part-code"
                error={form.formState.errors.shortCode?.message}
                hint="Left blank, it's derived from the name."
              >
                <Input id="part-code" {...form.register("shortCode")} />
              </Field>
              <Field label="Order" htmlFor="part-order" error={form.formState.errors.sortOrder?.message}>
                <Input id="part-order" type="number" min={0} {...form.register("sortOrder")} />
              </Field>
            </div>
            <Field label="Colour" htmlFor="part-color" error={form.formState.errors.color?.message} required>
              <div className="flex gap-2">
                <input
                  id="part-color"
                  type="color"
                  className="h-10 w-14 cursor-pointer rounded border border-input bg-card"
                  value={form.watch("color")}
                  onChange={(event) => form.setValue("color", event.target.value, { shouldDirty: true })}
                />
                <Input
                  value={form.watch("color")}
                  onChange={(event) => form.setValue("color", event.target.value, { shouldDirty: true })}
                  aria-label="Colour hex value"
                  className="font-mono"
                />
              </div>
            </Field>
            <Field label="Description" htmlFor="part-description" error={form.formState.errors.description?.message}>
              <Input id="part-description" {...form.register("description")} />
            </Field>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="part-active">Available to singers</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Hiding a part keeps its songs but removes it from the picker.
                </p>
              </div>
              <Switch
                id="part-active"
                checked={form.watch("isActive") ?? true}
                onCheckedChange={(checked) => form.setValue("isActive", checked, { shouldDirty: true })}
              />
            </div>
          </form>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditing(null);
                setCreating(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" form="voice-part-form" loading={save.isPending}>
              {editing ? "Save changes" : "Add voice part"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(next) => !next && setPendingDelete(null)}
        title={inUse ? "This part is still in use" : "Delete this voice part?"}
        destructive={!inUse}
        confirmLabel={inUse ? "Delete anyway" : "Delete voice part"}
        loading={remove.isPending}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)}
        description={
          usage.isLoading ? (
            <span>Checking where it's used…</span>
          ) : inUse ? (
            <span>
              <strong>{pendingDelete?.name}</strong> is assigned to {usage.data?.songs} song(s) and{" "}
              {usage.data?.members} member(s). The database will refuse the delete — set the part to
              hidden instead, or reassign those songs and members first.
            </span>
          ) : (
            <span>
              <strong>{pendingDelete?.name}</strong> isn't used by any song or member, so it can be removed
              safely.
            </span>
          )
        }
      />
    </div>
  );
}
