"use client";

import { useState } from "react";
import {
  Artifact,
  ArtifactActions,
  ArtifactAction,
  ArtifactContent,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from "@/components/ai-elements/artifact";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmailVariantBlock {
  type: string;
  accent?: string;
  headline?: string;
  subhead?: string;
  body?: string;
  cta?: string;
  bullets?: string[];
  product_name?: string;
  price?: string;
  one_liner?: string;
  products?: Array<{ product_name: string; price: string; one_liner: string }>;
  quote?: string;
  attribution?: string;
  code?: string;
  message?: string;
  expiry?: string;
}

export interface EmailVariantData {
  label: "A" | "B" | "C";
  approach: string;
  subject: string;
  preheader?: string;
  blocks: EmailVariantBlock[];
}

/**
 * Renders the three email variants returned by the
 * `generate_email_variants` tool as side-by-side Artifact cards.
 * Each card has a copy-to-clipboard action, shows the subject as the
 * title, approach as description, and the rendered blocks as content.
 */
export function EmailVariants({
  angle,
  variants,
}: {
  angle?: string;
  variants: EmailVariantData[];
}) {
  return (
    <div className="not-prose my-3 flex flex-col gap-4">
      {angle ? (
        <p className="text-muted-foreground text-sm">
          <span className="font-medium text-foreground">Angle · </span>
          {angle}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {variants.map((variant) => (
          <VariantCard key={variant.label} variant={variant} />
        ))}
      </div>
    </div>
  );
}

function VariantCard({ variant }: { variant: EmailVariantData }) {
  const [copied, setCopied] = useState(false);
  const text = variantToText(variant);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — ignore
    }
  }

  return (
    <Artifact className="flex flex-col">
      <ArtifactHeader className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="rounded-sm px-1.5 py-0 text-[10px]">
              Version {variant.label}
            </Badge>
            <Mail className="text-muted-foreground size-3.5" />
          </div>
          <ArtifactTitle className="line-clamp-2 leading-tight">
            {variant.subject}
          </ArtifactTitle>
          {variant.preheader ? (
            <ArtifactDescription className="line-clamp-1 text-xs">
              {variant.preheader}
            </ArtifactDescription>
          ) : null}
        </div>
        <ArtifactActions>
          <ArtifactAction
            tooltip={copied ? "Copied" : "Copy email"}
            icon={copied ? Check : Copy}
            onClick={copy}
            className={cn(copied && "text-primary")}
          />
        </ArtifactActions>
      </ArtifactHeader>
      <ArtifactContent className="max-h-[440px] overflow-y-auto">
        <p className="text-muted-foreground mb-3 text-xs italic">{variant.approach}</p>
        <div className="flex flex-col gap-3">
          {variant.blocks.map((block, i) => (
            <BlockRender key={i} block={block} />
          ))}
        </div>
      </ArtifactContent>
    </Artifact>
  );
}

function BlockRender({ block }: { block: EmailVariantBlock }) {
  switch (block.type) {
    case "hero":
      return (
        <div className="bg-muted/40 rounded-lg border p-3">
          {block.accent ? (
            <div className="text-primary mb-1 text-[10px] font-semibold uppercase tracking-wider">
              {block.accent}
            </div>
          ) : null}
          <div className="text-base font-semibold leading-tight">{block.headline}</div>
          {block.subhead ? (
            <div className="text-muted-foreground mt-1 text-sm">{block.subhead}</div>
          ) : null}
          {block.cta ? (
            <div className="mt-2">
              <span className="bg-primary text-primary-foreground rounded-md px-2 py-0.5 text-xs font-medium">
                {block.cta}
              </span>
            </div>
          ) : null}
        </div>
      );
    case "text":
      return (
        <div>
          {block.accent ? (
            <div className="text-muted-foreground mb-0.5 text-[10px] font-semibold uppercase tracking-wider">
              {block.accent}
            </div>
          ) : null}
          {block.headline ? (
            <div className="text-sm font-semibold">{block.headline}</div>
          ) : null}
          {block.body ? <div className="text-sm leading-relaxed">{block.body}</div> : null}
          {block.cta ? (
            <div className="text-primary mt-1 text-xs font-medium">→ {block.cta}</div>
          ) : null}
        </div>
      );
    case "bullets":
      return (
        <div>
          {block.headline ? (
            <div className="mb-1 text-sm font-semibold">{block.headline}</div>
          ) : null}
          <ul className="ml-4 list-disc space-y-0.5 text-sm">
            {(block.bullets ?? []).map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          {block.cta ? (
            <div className="text-primary mt-1 text-xs font-medium">→ {block.cta}</div>
          ) : null}
        </div>
      );
    case "product_card":
      return (
        <div className="flex items-center justify-between rounded-md border p-2">
          <div>
            <div className="text-sm font-semibold">{block.product_name}</div>
            <div className="text-muted-foreground text-xs">{block.one_liner}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="font-semibold">{block.price}</div>
            {block.cta ? (
              <span className="bg-primary text-primary-foreground rounded px-2 py-0.5 text-[10px] font-medium">
                {block.cta}
              </span>
            ) : null}
          </div>
        </div>
      );
    case "product_grid":
      return (
        <div>
          {block.headline ? (
            <div className="mb-1 text-sm font-semibold">{block.headline}</div>
          ) : null}
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {(block.products ?? []).map((p, i) => (
              <div key={i} className="rounded-md border p-2 text-xs">
                <div className="font-semibold">{p.product_name}</div>
                <div className="text-muted-foreground">{p.one_liner}</div>
                <div className="mt-0.5 font-medium">{p.price}</div>
              </div>
            ))}
          </div>
        </div>
      );
    case "cta_block":
      return (
        <div className="bg-primary/5 border-primary/20 rounded-lg border p-3 text-center">
          {block.accent ? (
            <div className="text-primary mb-1 text-[10px] font-semibold uppercase tracking-wider">
              {block.accent}
            </div>
          ) : null}
          <div className="text-sm font-semibold">{block.headline}</div>
          {block.subhead ? (
            <div className="text-muted-foreground text-xs">{block.subhead}</div>
          ) : null}
          {block.cta ? (
            <div className="mt-2">
              <span className="bg-primary text-primary-foreground rounded-md px-2 py-0.5 text-xs font-medium">
                {block.cta}
              </span>
            </div>
          ) : null}
        </div>
      );
    case "social_proof":
      return (
        <blockquote className="text-muted-foreground border-l-2 pl-3 text-sm italic">
          &ldquo;{block.quote}&rdquo;
          <div className="mt-1 text-xs not-italic">— {block.attribution}</div>
        </blockquote>
      );
    case "discount_bar":
      return (
        <div className="border-primary/30 bg-primary/5 flex items-center justify-between rounded-md border p-2 text-xs">
          <span className="font-medium">{block.message}</span>
          <code className="bg-background rounded border px-1.5 py-0.5 font-mono">
            {block.code}
          </code>
        </div>
      );
    default:
      return null;
  }
}

function variantToText(v: EmailVariantData): string {
  const lines: string[] = [`Subject: ${v.subject}`];
  if (v.preheader) lines.push(`Preheader: ${v.preheader}`);
  lines.push("", `(Approach: ${v.approach})`, "");
  for (const b of v.blocks) {
    switch (b.type) {
      case "hero":
      case "cta_block":
        if (b.accent) lines.push(b.accent.toUpperCase());
        if (b.headline) lines.push(b.headline);
        if (b.subhead) lines.push(b.subhead);
        if (b.cta) lines.push(`[${b.cta}]`);
        lines.push("");
        break;
      case "text":
        if (b.headline) lines.push(b.headline);
        if (b.body) lines.push(b.body);
        if (b.cta) lines.push(`[${b.cta}]`);
        lines.push("");
        break;
      case "bullets":
        if (b.headline) lines.push(b.headline);
        for (const x of b.bullets ?? []) lines.push(`• ${x}`);
        if (b.cta) lines.push(`[${b.cta}]`);
        lines.push("");
        break;
      case "product_card":
        lines.push(`${b.product_name} — ${b.price}`);
        if (b.one_liner) lines.push(b.one_liner);
        if (b.cta) lines.push(`[${b.cta}]`);
        lines.push("");
        break;
      case "product_grid":
        if (b.headline) lines.push(b.headline);
        for (const p of b.products ?? [])
          lines.push(`- ${p.product_name} (${p.price}) — ${p.one_liner}`);
        lines.push("");
        break;
      case "social_proof":
        if (b.quote) lines.push(`"${b.quote}"`);
        if (b.attribution) lines.push(`— ${b.attribution}`);
        lines.push("");
        break;
      case "discount_bar":
        if (b.message) lines.push(b.message);
        if (b.code) lines.push(`Code: ${b.code}`);
        lines.push("");
        break;
    }
  }
  return lines.join("\n").trim();
}
