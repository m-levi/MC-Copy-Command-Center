import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getLightweightModel } from '@/lib/ai-providers';
import { DocumentFolder, BrandDocumentV2, AIOrganizeResult, SMART_FOLDER_PRESETS } from '@/types';

// Schema for AI folder suggestions
const FolderSuggestionSchema = z.object({
  suggestions: z.array(z.object({
    document_id: z.string().describe('The document ID being categorized'),
    folder_id: z.string().describe('The folder ID to assign the document to'),
    confidence: z.number().min(0).max(1).describe('Confidence score between 0 and 1'),
    reason: z.string().describe('Brief explanation for the categorization'),
  })),
});

// POST /api/brands/[brandId]/folders/organize - AI organize documents into folders
export async function POST(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { 
      document_ids, // Optional: specific document IDs to organize
      apply = false, // If true, apply changes directly
      create_smart_folders = false, // If true, auto-create smart folders from presets
    } = body;
    
    // First, ensure we have folders to organize into
    let { data: folders, error: foldersError } = await supabase
      .from('document_folders')
      .select('*')
      .eq('brand_id', brandId)
      .order('sort_order', { ascending: true });
    
    if (foldersError) {
      logger.error('Error fetching folders:', foldersError);
      return NextResponse.json(
        { error: 'Failed to fetch folders' },
        { status: 500 }
      );
    }
    
    // If no folders and create_smart_folders is true, create from presets
    if ((!folders || folders.length === 0) && create_smart_folders) {
      const createdFolders: DocumentFolder[] = [];
      
      for (let i = 0; i < SMART_FOLDER_PRESETS.length; i++) {
        const preset = SMART_FOLDER_PRESETS[i];
        const { data: newFolder, error: createError } = await supabase
          .from('document_folders')
          .insert({
            brand_id: brandId,
            created_by: user.id,
            name: preset.name,
            description: preset.description,
            color: preset.color,
            icon: preset.icon,
            is_smart: true,
            smart_criteria: preset.criteria,
            sort_order: i + 1,
            document_count: 0,
          })
          .select()
          .single();
        
        if (!createError && newFolder) {
          createdFolders.push(newFolder);
        }
      }
      
      folders = createdFolders;
    }
    
    if (!folders || folders.length === 0) {
      return NextResponse.json({
        error: 'No folders available. Create folders first or enable create_smart_folders.',
        suggestions: [],
      }, { status: 400 });
    }
    
    // Fetch documents to organize
    let documentsQuery = supabase
      .from('brand_documents_v2')
      .select('id, title, description, content, extracted_text, category, tags, doc_type')
      .eq('brand_id', brandId);
    
    // If specific document IDs provided, filter by them
    if (document_ids && document_ids.length > 0) {
      documentsQuery = documentsQuery.in('id', document_ids);
    } else {
      // Only organize documents without a folder
      documentsQuery = documentsQuery.is('folder_id', null);
    }
    
    const { data: documents, error: docsError } = await documentsQuery.limit(50);
    
    if (docsError) {
      logger.error('Error fetching documents:', docsError);
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }
    
    if (!documents || documents.length === 0) {
      return NextResponse.json({
        message: 'No documents to organize',
        suggestions: [],
        folders_created: folders?.filter(f => f.is_smart).length || 0,
      });
    }
    
    // Build folder descriptions for AI
    const folderDescriptions = folders.map(f => ({
      id: f.id,
      name: f.name,
      description: f.description || '',
      criteria: f.smart_criteria,
    }));
    
    // Build document summaries for AI
    const documentSummaries = documents.map(d => ({
      id: d.id,
      title: d.title,
      description: d.description || '',
      content_preview: (d.content || d.extracted_text || '').slice(0, 500),
      category: d.category,
      tags: d.tags || [],
      type: d.doc_type,
    }));
    
    // Call AI to suggest folder assignments
    const model = getLightweightModel();
    
    const prompt = `You are an AI document organizer. Analyze the following documents and suggest which folder each should be placed in.

## Available Folders:
${JSON.stringify(folderDescriptions, null, 2)}

## Documents to Organize:
${JSON.stringify(documentSummaries, null, 2)}

For each document, suggest the best folder match based on:
1. The document's title, description, and content
2. The folder's name, description, and criteria
3. The document's category and tags

Only suggest a folder if you're confident it's a good match (confidence > 0.5).
If no folder is a good match, don't include that document in suggestions.

Provide a brief reason for each suggestion.`;

    const { object: aiResult } = await generateObject({
      model,
      schema: FolderSuggestionSchema,
      prompt,
    });
    
    // Enrich suggestions with document and folder names
    const enrichedSuggestions: AIOrganizeResult[] = aiResult.suggestions.map(s => {
      const folder = folders.find(f => f.id === s.folder_id);
      const document = documents.find(d => d.id === s.document_id);
      
      return {
        folder_id: s.folder_id,
        folder_name: folder?.name || 'Unknown',
        document_id: s.document_id,
        document_title: document?.title || 'Unknown',
        confidence: s.confidence,
        reason: s.reason,
      };
    }).filter(s => s.confidence >= 0.5); // Only include confident suggestions
    
    // If apply is true, actually move documents to folders
    let appliedCount = 0;
    if (apply && enrichedSuggestions.length > 0) {
      for (const suggestion of enrichedSuggestions) {
        const { error: updateError } = await supabase
          .from('brand_documents_v2')
          .update({ folder_id: suggestion.folder_id })
          .eq('id', suggestion.document_id);
        
        if (!updateError) {
          appliedCount++;
        }
      }
    }
    
    return NextResponse.json({
      suggestions: enrichedSuggestions,
      total_documents: documents.length,
      suggested_count: enrichedSuggestions.length,
      applied_count: apply ? appliedCount : 0,
      folders_created: create_smart_folders ? folders.filter(f => f.is_smart).length : 0,
    });
  } catch (error) {
    logger.error('Error in POST /folders/organize:', error);
    return NextResponse.json(
      { error: 'Failed to organize documents' },
      { status: 500 }
    );
  }
}

// GET /api/brands/[brandId]/folders/organize - Get organization preview without applying
export async function GET(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> }
) {
  // Redirect to POST with apply=false
  const url = new URL(request.url);
  const { brandId } = await params;
  
  const response = await POST(
    new Request(url.origin + url.pathname, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apply: false }),
    }),
    { params: Promise.resolve({ brandId }) }
  );
  
  return response;
}























