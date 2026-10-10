import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { api, errorMessage, formatBytes } from "@/lib/api";
import { UPLOAD_LIMITS, type Upload, type UploadKind } from "../../shared/types";

const KIND_LABELS: Record<UploadKind, string> = { deck: "Pitch deck", video: "Demo video" };
const PART_ATTEMPTS = 3;

async function uploadFile(teamId: number, kind: UploadKind, file: File, onProgress: (fraction: number) => void) {
  const { id, partSize } = await api<{ id: number; partSize: number }>("/api/participant/uploads", {
    method: "POST",
    body: { teamId, kind, filename: file.name, size: file.size, contentType: file.type },
  });
  try {
    const parts: { partNumber: number; etag: string }[] = [];
    const partCount = Math.ceil(file.size / partSize);
    for (let index = 0; index < partCount; index++) {
      const chunk = file.slice(index * partSize, (index + 1) * partSize);
      for (let attempt = 1; ; attempt++) {
        try {
          parts.push(
            await api(`/api/participant/uploads/${id}/parts/${index + 1}`, { method: "PUT", body: chunk }),
          );
          break;
        } catch (error) {
          // Venue wifi drops; retry the part instead of restarting the file.
          if (attempt >= PART_ATTEMPTS) throw error;
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
      onProgress((index + 1) / partCount);
    }
    await api(`/api/participant/uploads/${id}/complete`, { method: "POST", body: { parts } });
  } catch (error) {
    await api(`/api/participant/uploads/${id}`, { method: "DELETE" }).catch(() => undefined);
    throw error;
  }
}

export function TeamUploads({ teamId }: { teamId: number }) {
  const queryClient = useQueryClient();
  const uploads = useQuery({
    queryKey: ["uploads", teamId],
    queryFn: () => api<Upload[]>(`/api/participant/uploads?teamId=${teamId}`),
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {(Object.keys(KIND_LABELS) as UploadKind[]).map((kind) => (
        <UploadSlot
          key={kind}
          teamId={teamId}
          kind={kind}
          uploads={(uploads.data ?? []).filter((upload) => upload.kind === kind)}
          onUploaded={() => queryClient.invalidateQueries({ queryKey: ["uploads", teamId] })}
        />
      ))}
    </div>
  );
}

function UploadSlot({
  teamId,
  kind,
  uploads,
  onUploaded,
}: {
  teamId: number;
  kind: UploadKind;
  uploads: Upload[];
  onUploaded: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const limits = UPLOAD_LIMITS[kind];

  async function handleFile(file: File) {
    if (file.size > limits.maxBytes) {
      toast.error(`${KIND_LABELS[kind]} must be under ${formatBytes(limits.maxBytes)}`);
      return;
    }
    setProgress(0);
    try {
      await uploadFile(teamId, kind, file, setProgress);
      toast.success(`${KIND_LABELS[kind]} uploaded`);
      onUploaded();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div>
        <p className="font-medium">{KIND_LABELS[kind]}</p>
        <p className="text-xs text-muted-foreground">
          {limits.extensions.map((extension) => `.${extension}`).join(" ")} · up to {formatBytes(limits.maxBytes)}
        </p>
      </div>
      <input
        ref={input}
        type="file"
        className="hidden"
        accept={limits.extensions.map((extension) => `.${extension}`).join(",")}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleFile(file);
        }}
      />
      {progress === null ? (
        <Button variant="outline" onClick={() => input.current?.click()}>
          {uploads.length > 0 ? "Upload a newer version" : "Choose file"}
        </Button>
      ) : (
        <div className="flex items-center gap-3">
          <Progress value={progress * 100} />
          <span className="font-mono text-xs">{Math.round(progress * 100)}%</span>
        </div>
      )}
      {uploads.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {uploads.map((upload, index) => (
            <li key={upload.id} className="flex justify-between gap-3">
              <span className="truncate">
                {upload.filename}
                {index === 0 && uploads.length > 1 && <span className="ml-2 text-muted-foreground">latest</span>}
              </span>
              <span className="shrink-0 text-muted-foreground">{formatBytes(upload.size)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
