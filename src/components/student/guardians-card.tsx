"use client";

import { useState } from "react";
import { UserPlus, MoreHorizontal, Trash2, Pencil, Mail, Phone } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

type GuardianFormState = {
  firstName: string;
  lastName: string;
  relationship: string;
  email: string;
  phone: string;
  preferredContact: string;
  notes: string;
};

const emptyForm: GuardianFormState = {
  firstName: "",
  lastName: "",
  relationship: "",
  email: "",
  phone: "",
  preferredContact: "",
  notes: "",
};

type Guardian = {
  id: string;
  firstName: string;
  lastName: string;
  relationship: string;
  email: string | null;
  phone: string | null;
  preferredContact: string | null;
  notes: string | null;
};

export function GuardiansCard({ studentId }: { studentId: string }) {
  const utils = trpc.useUtils();
  const { data: guardians, isLoading, isError } = trpc.guardian.list.useQuery({ studentId });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Guardian | null>(null);

  const deleteMutation = trpc.guardian.delete.useMutation({
    onSuccess: () => {
      utils.guardian.list.invalidate({ studentId });
      toast.success("Guardian removed");
    },
    onError: (err) => toast.error(err.message),
  });

  if (isError) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
        <p className="text-sm text-destructive">Failed to load guardians.</p>
      </div>
    );
  }

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (g: Guardian) => {
    setEditing(g);
    setDialogOpen(true);
  };

  return (
    <div className="rounded-2xl border border-foreground/[0.06] bg-card p-5 glow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Guardians
        </h3>
        <Button variant="ghost" size="sm" onClick={openAdd}>
          <UserPlus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : !guardians?.length ? (
        <div className="text-center py-8">
          <UserPlus className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No guardians yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Add a parent or guardian to send weekly updates.
          </p>
          <Button variant="link" size="sm" onClick={openAdd} className="mt-1">
            Add a guardian
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {guardians.map((g) => (
            <div
              key={g.id}
              className="flex items-center gap-3 rounded-xl border border-foreground/[0.04] bg-foreground/[0.02] p-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {g.firstName} {g.lastName}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    · {g.relationship}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  {g.email && (
                    <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <Mail className="h-3 w-3 shrink-0" /> {g.email}
                    </span>
                  )}
                  {g.phone && (
                    <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <Phone className="h-3 w-3 shrink-0" /> {g.phone}
                    </span>
                  )}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md h-7 w-7 shrink-0 hover:bg-accent hover:text-accent-foreground transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(g)}>
                    <Pencil className="h-4 w-4 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => {
                      if (confirm(`Remove ${g.firstName} ${g.lastName}?`)) {
                        deleteMutation.mutate({ id: g.id });
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <GuardianDialog
        studentId={studentId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
      />
    </div>
  );
}

function GuardianDialog({
  studentId,
  open,
  onOpenChange,
  editing,
}: {
  studentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Guardian | null;
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState<GuardianFormState>(emptyForm);

  // Sync form when dialog opens for a different target.
  const targetKey = editing?.id ?? "new";
  const [syncedKey, setSyncedKey] = useState<string | null>(null);
  if (open && syncedKey !== targetKey) {
    setSyncedKey(targetKey);
    setForm(
      editing
        ? {
            firstName: editing.firstName,
            lastName: editing.lastName,
            relationship: editing.relationship,
            email: editing.email ?? "",
            phone: editing.phone ?? "",
            preferredContact: editing.preferredContact ?? "",
            notes: editing.notes ?? "",
          }
        : emptyForm
    );
  }
  if (!open && syncedKey !== null) {
    setSyncedKey(null);
  }

  const onDone = () => {
    utils.guardian.list.invalidate({ studentId });
    onOpenChange(false);
  };

  const create = trpc.guardian.create.useMutation({
    onSuccess: () => {
      toast.success("Guardian added");
      onDone();
    },
    onError: (err) => toast.error(err.message),
  });

  const update = trpc.guardian.update.useMutation({
    onSuccess: () => {
      toast.success("Guardian updated");
      onDone();
    },
    onError: (err) => toast.error(err.message),
  });

  const isPending = create.isPending || update.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      relationship: form.relationship,
      email: form.email || undefined,
      phone: form.phone || undefined,
      preferredContact: form.preferredContact || undefined,
      notes: form.notes || undefined,
    };
    if (editing) {
      update.mutate({ id: editing.id, ...payload });
    } else {
      create.mutate({ studentId, ...payload });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Guardian" : "Add Guardian"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>First name *</Label>
              <Input
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Last name *</Label>
              <Input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label>Relationship *</Label>
            <Input
              value={form.relationship}
              onChange={(e) => setForm({ ...form, relationship: e.target.value })}
              placeholder="e.g. Mother, Father, Guardian"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="parent@example.com"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div>
            <Label>Preferred contact</Label>
            <Input
              value={form.preferredContact}
              onChange={(e) => setForm({ ...form, preferredContact: e.target.value })}
              placeholder="e.g. Email, Phone, Text"
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Anything the counselor should remember..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? editing
                  ? "Saving..."
                  : "Adding..."
                : editing
                ? "Save Changes"
                : "Add Guardian"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
