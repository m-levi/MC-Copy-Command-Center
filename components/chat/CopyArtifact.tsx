"use client";

import { useState } from "react";
import {
  Artifact,
  ArtifactAction,
  ArtifactActions,
  ArtifactContent,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from "@/components/ai-elements/artifact";
import { Badge } from "@/components/ui/badge";
import { Streamdown } from "streamdown";
import { Check, Copy, FileText, Loader2 } from "lucide-react";
import { deriveCopyTitle } from "@/lib/workflows/copy-artifact";
import { cn } from "@/lib/utils";

/**
 * Renders one `<copy>…</copy>` block from the assistant as an AI Elements
 * Artifact. While the model is still streaming into the block (no closing
 * tag yet) we show a "Generating…" indicator instead of the copy button.
 */
export function CopyArtifact({
  content,
  streaming,
  index,
}: {
  content: string;
  streaming?: boolean;
  index: number;
}) {
  const [copied, setCopied] = useState(false);
  const title = deriveCopyTitle(content);

  async function copy() {
    try {
      await navigator.clipboard.writeText(content.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — ignore
    }
  }

  return (
    <Artifact className="not-prose my-3">
      <ArtifactHeader className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary rounded-sm border-0 px-1.5 py-0 text-[10px]"
            >
              <FileText className="mr-1 size-3" />
              Copy · {index + 1}
            </Badge>
            {streaming ? (
              <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                <Loader2 className="size-3 animate-spin" />
                Generating…
              </span>
            ) : null}
          </div>
          <ArtifactTitle className="line-clamp-2 leading-tight">
            {title}
          </ArtifactTitle>
          <ArtifactDescription className="text-xs">
            Ready-to-ship marketing copy
          </ArtifactDescription>
        </div>
        {!streaming ? (
          <ArtifactActions>
            <ArtifactAction
              tooltip={copied ? "Copied" : "Copy to clipboard"}
              icon={copied ? Check : Copy}
              onClick={copy}
              className={cn(copied && "text-primary")}
            />
          </ArtifactActions>
        ) : null}
      </ArtifactHeader>
      <ArtifactContent className="max-h-[600px] overflow-y-auto">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <Streamdown>{content.trim()}</Streamdown>
        </div>
      </ArtifactContent>
    </Artifact>
  );
}
