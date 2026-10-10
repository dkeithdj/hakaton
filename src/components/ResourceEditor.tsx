import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Section } from "@/components/event";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api, errorMessage } from "@/lib/api";

const NONE = "none";

export interface EditorField {
  key: string;
  label: string;
  /** `lines` edits a string[] one entry per line; `option` picks an id or null. */
  type: "text" | "textarea" | "number" | "lines" | "option";
  options?: { id: number; label: string }[];
  placeholder?: string;
  hideInTable?: boolean;
}

type Item = { id: number } & Record<string, unknown>;

function toFormValue(field: EditorField, value: unknown): string {
  if (field.type === "lines") return ((value as string[] | undefined) ?? []).join("\n");
  if (field.type === "option") return value == null ? NONE : String(value);
  if (field.type === "number") return String(value ?? 0);
  return (value as string | undefined) ?? "";
}

function fromFormValue(field: EditorField, value: string): unknown {
  if (field.type === "lines") return value.split("\n").map((line) => line.trim()).filter(Boolean);
  if (field.type === "option") return value === NONE ? null : Number(value);
  if (field.type === "number") return Math.trunc(Number(value) || 0);
  return value;
}

function toCell(field: EditorField, value: unknown): string {
  if (field.type === "lines") return ((value as string[]) ?? []).join(", ");
  if (field.type === "option") return field.options?.find((option) => option.id === value)?.label ?? "—";
  return String(value ?? "");
}

export function ResourceEditor({
  resource,
  title,
  description,
  singular,
  items,
  fields,
}: {
  resource: string;
  title: string;
  description?: string;
  singular: string;
  items: Item[];
  fields: EditorField[];
}) {
  const queryClient = useQueryClient();
  // `null` = closed, `"new"` = creating, otherwise the item being edited.
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["state"] });
    queryClient.invalidateQueries({ queryKey: ["admin"] });
  };

  const save = useMutation({
    mutationFn: () => {
      const body = Object.fromEntries(fields.map((field) => [field.key, fromFormValue(field, form[field.key] ?? "")]));
      return editing === "new"
        ? api(`/api/admin/resources/${resource}`, { method: "POST", body })
        : api(`/api/admin/resources/${resource}/${(editing as Item).id}`, { method: "PUT", body });
    },
    onSuccess: () => {
      setEditing(null);
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api(`/api/admin/resources/${resource}/${id}`, { method: "DELETE" }),
    onSuccess: refresh,
    onError: (error) => toast.error(errorMessage(error)),
  });

  function open(item: Item | "new") {
    setForm(
      Object.fromEntries(
        fields.map((field) => [
          field.key,
          item === "new" && field.key === "sort"
            ? String(items.length + 1)
            : toFormValue(field, item === "new" ? undefined : item[field.key]),
        ]),
      ),
    );
    setEditing(item);
  }

  const columns = fields.filter((field) => !field.hideInTable);

  return (
    <Section
      title={title}
      description={description}
      action={
        <Button size="sm" onClick={() => open("new")}>
          <PlusIcon />
          Add {singular}
        </Button>
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((field) => (
                <TableHead key={field.key}>{field.label}</TableHead>
              ))}
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                {columns.map((field) => (
                  <TableCell key={field.key} className="max-w-64 truncate">
                    {toCell(field, item[field.key])}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  <Button size="icon-sm" variant="ghost" aria-label={`Edit ${singular}`} onClick={() => open(item)}>
                    <PencilIcon />
                  </Button>
                  <ConfirmButton
                    title={`Delete this ${singular}?`}
                    description="This cannot be undone."
                    confirmLabel="Delete"
                    onConfirm={() => remove.mutate(item.id)}
                  >
                    <Button size="icon-sm" variant="ghost" aria-label={`Delete ${singular}`}>
                      <Trash2Icon />
                    </Button>
                  </ConfirmButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={editing !== null} onOpenChange={(isOpen) => !isOpen && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing === "new" ? "Add" : "Edit"} {singular}
            </DialogTitle>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
          >
            {fields.map((field) => {
              const id = `${resource}-${field.key}`;
              const value = form[field.key] ?? "";
              const set = (next: string) => setForm((current) => ({ ...current, [field.key]: next }));
              return (
                <div key={field.key} className="flex flex-col gap-2">
                  <Label htmlFor={id}>{field.label}</Label>
                  {field.type === "textarea" || field.type === "lines" ? (
                    <Textarea
                      id={id}
                      rows={field.type === "lines" ? 4 : 6}
                      placeholder={field.placeholder}
                      value={value}
                      onChange={(event) => set(event.target.value)}
                    />
                  ) : field.type === "option" ? (
                    <Select value={value} onValueChange={set}>
                      <SelectTrigger id={id} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>None</SelectItem>
                        {field.options?.map((option) => (
                          <SelectItem key={option.id} value={String(option.id)}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={id}
                      type={field.type === "number" ? "number" : "text"}
                      placeholder={field.placeholder}
                      value={value}
                      onChange={(event) => set(event.target.value)}
                    />
                  )}
                </div>
              );
            })}
            <DialogFooter>
              <Button type="submit" disabled={save.isPending}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Section>
  );
}
