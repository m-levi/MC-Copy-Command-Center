import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MEMORY_CATEGORIES = [
  "user_preference",
  "brand_context",
  "campaign_info",
  "product_details",
  "decision",
  "fact",
] as const;

const createSchema = z.object({
  content: z.string().min(1).max(4000),
  category: z.enum(MEMORY_CATEGORIES),
  title: z.string().max(120).optional(),
});

/**
 * GET — every memory_notes row for this brand owned by the caller.
 * POST — append a memory scoped to (caller, brand). The same rows are
 * what `memory_recall` reads during chat, so anything saved here is
 * immediately visible to the model.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ brandId: string }> },
) {
  const { brandId } = await params;
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabase
    .from("memory_notes")
    .select("id, content, category, title, created_at")
    .eq("brand_id", brandId)
    .eq("user_id", userRes.user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ memories: data ?? [] });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ brandId: string }> },
) {
  const { brandId } = await params;
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 },
    );
  }
  const { data, error } = await supabase
    .from("memory_notes")
    .insert({
      user_id: userRes.user.id,
      brand_id: brandId,
      content: parsed.data.content,
      category: parsed.data.category,
      title: parsed.data.title ?? null,
    })
    .select("id, content, category, title, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ memory: data }, { status: 201 });
}
