"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MAX_UPLOAD_BYTES,
  blobKeyFor,
  isAllowedMime,
} from "@/lib/integrations/blob";

const docTypeLabels: Record<string, string> = {
  QUESTIONNAIRE: "Questionnaire",
  TRANSCRIPT: "Transcript",
  TEST_SCORE: "Test score",
  RESUME: "Résumé",
  ESSAY_DRAFT: "Essay draft",
  RECOMMENDATION_LETTER: "Rec letter",
  FINANCIAL_AID: "Financial aid",
  MEETING_NOTES: "Meeting notes",
  COMMUNICATION: "Communication",
  OTHER: "Other",
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

type Phase = "idle" | "uploading" | "extracting";

export function UploadDocumentsPanel({ studentId }: { studentId: string }) {
  const utils = trpc.useUtils();
  const { data: documents, isLoading } = trpc.document.list.useQuery({ studentId });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const uploading = phase !== "idle";

  const confirmUpload = trpc.document.confirmUpload.useMutation({
    onSuccess: (res) => {
      toast.success(
        `Extracted ${res.detectedType.toLowerCase()} — review pending approval`
      );
      utils.document.list.invalidate({ studentId });
      utils.review.pendingCount.invalidate();
      utils.review.list.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Extraction failed");
      utils.document.list.invalidate({ studentId });
    },
  });

  const deleteDocument = trpc.document.delete.useMutation({
    onSuccess: () => {
      utils.document.list.invalidate({ studentId });
      utils.review.pendingCount.invalidate();
      utils.review.list.invalidate();
      toast.success("Document deleted");
    },
    onError: (err) => toast.error(err.message || "Failed to delete"),
  });

  async function handleFile(file: File) {
    if (!isAllowedMime(file.type)) {
      toast.error("Unsupported file type. Use PDF, PNG, JPG, WEBP, HEIC, or TXT.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(`File too large (max ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)} MB).`);
      return;
    }

    setPhase("uploading");
    setUploadProgress(0);

    try {
      const pathname = blobKeyFor(studentId, file.name);
      const blob = await upload(pathname, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
        clientPayload: JSON.stringify({ studentId }),
        onUploadProgress: (p) => setUploadProgress(p.percentage),
      });

      setPhase("extracting");
      toast.info("Upload complete — running AI extraction…");
      await confirmUpload.mutateAsync({
        studentId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        storageUrl: blob.url,
        storageKey: pathname,
      });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPhase("idle");
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }
  function onDragLeave() {
    setIsDragging(false);
  }
  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await handleFile(file);
  }

  return (
    <div className="rounded-2xl border border-foreground/[0.06] bg-card p-5 glow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Documents & AI extraction
          </h3>
        </div>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition-all ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-foreground/10 bg-foreground/[0.02]"
        }`}
      >
        <Upload className="mx-auto h-7 w-7 text-muted-foreground/60 mb-2" />
        <p className="text-sm font-medium">Drop a transcript, résumé, or questionnaire</p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF, image, or plain text — up to {(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)} MB.
          AI will extract profile fields and queue for your approval.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.heif,.txt,application/pdf,image/*,text/plain"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <Button
          variant="outline"
          size="sm"
          className="mt-3 border-foreground/10 bg-foreground/5 hover:bg-foreground/10"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              {phase === "uploading"
                ? uploadProgress > 0 && uploadProgress < 100
                  ? `Uploading ${Math.round(uploadProgress)}%`
                  : "Finishing upload…"
                : "Extracting with AI…"}
            </>
          ) : (
            "Choose a file"
          )}
        </Button>
      </div>

      {/* List */}
      <div className="mt-5 space-y-2">
        {isLoading ? (
          <p className="text-xs text-muted-foreground py-2">Loading documents…</p>
        ) : !documents?.length ? (
          <p className="text-xs text-muted-foreground py-2">No uploads yet.</p>
        ) : (
          documents.map((d) => {
            const isImage = d.fileType.startsWith("image/");
            const Icon = isImage ? ImageIcon : FileText;
            return (
              <div
                key={d.id}
                className="flex items-center gap-3 rounded-xl bg-foreground/[0.03] p-3 hover:bg-foreground/[0.06] transition-colors group"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground/5">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.fileName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge
                      variant="secondary"
                      className="bg-foreground/5 text-muted-foreground border-foreground/10 text-[10px]"
                    >
                      {docTypeLabels[d.documentType] || d.documentType}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {formatBytes(d.fileSize)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      · {formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <ExtractionStatusBadge status={d.extractionStatus} error={d.extractionError} />
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete ${d.fileName}?`)) {
                      deleteDocument.mutate({ id: d.id });
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ExtractionStatusBadge({
  status,
  error,
}: {
  status: string | null;
  error: string | null;
}) {
  if (!status || status === "PROCESSING")
    return (
      <Badge className="bg-amber-500/15 text-amber-400 border-0 text-[10px]">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        Extracting
      </Badge>
    );
  if (status === "READY")
    return (
      <Badge className="bg-primary/15 text-primary border-0 text-[10px]">
        <Sparkles className="h-3 w-3 mr-1" />
        Review pending
      </Badge>
    );
  if (status === "APPLIED")
    return (
      <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px]">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Applied
      </Badge>
    );
  if (status === "REJECTED")
    return (
      <Badge className="bg-foreground/5 text-muted-foreground border-0 text-[10px]">
        Rejected
      </Badge>
    );
  if (status === "FAILED")
    return (
      <Badge
        className="bg-red-500/15 text-red-400 border-0 text-[10px]"
        title={error ?? undefined}
      >
        <AlertCircle className="h-3 w-3 mr-1" />
        Failed
      </Badge>
    );
  return null;
}
