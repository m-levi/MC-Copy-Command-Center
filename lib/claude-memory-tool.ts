/**
 * Claude Native Memory Tool Implementation
 * 
 * Implements Claude's official memory_20250818 tool using file-based storage
 * backed by Supabase. This allows Claude to autonomously manage memory
 * across conversations.
 * 
 * Reference: https://docs.claude.com/en/docs/agents-and-tools/tool-use/memory-tool
 */

import { createClient } from '@/lib/supabase/server';
import { createEdgeClient } from '@/lib/supabase/edge';
import { logger } from '@/lib/logger';

interface MemoryFile {
  id: string;
  conversation_id: string | null; // null for global memory
  file_path: string; // e.g., "/user_preferences.txt" or "/brand_context/shopify_store.txt"
  content: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get the appropriate Supabase client based on runtime
 */
async function getSupabaseClient() {
  const isEdge = typeof (globalThis as any).EdgeRuntime !== 'undefined' || 
                 process.env.NEXT_RUNTIME === 'edge';
  
  if (isEdge) {
    return createEdgeClient();
  } else {
    return await createClient();
  }
}

/**
 * Memory Tool Commands supported by Claude
 */
export type MemoryCommand = 
  | 'view' 
  | 'create' 
  | 'edit' 
  | 'insert' 
  | 'delete' 
  | 'rename';

/**
 * Claude Memory Tool Handler
 * Processes memory commands from Claude and stores data in Supabase
 */
export class ClaudeMemoryTool {
  private conversationId: string | null;

  constructor(conversationId: string | null = null) {
    this.conversationId = conversationId;
  }

  /**
   * View command - list directory contents or read file
   * @param path - File path (empty or "/" for root directory list)
   */
  async view(path: string): Promise<string> {
    try {
      const supabase = await getSupabaseClient();
      
      // If path is empty or "/", list all files in root
      if (!path || path === '/') {
        const { data, error } = await supabase
          .from('claude_memory_files')
          .select('file_path, updated_at')
          .eq('conversation_id', this.conversationId)
          .order('file_path', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
          return 'Empty directory. No memory files yet.';
        }

        // Format as directory listing
        const files = data.map(f => `${f.file_path} (modified: ${new Date(f.updated_at).toISOString()})`);
        return `Directory listing:\n${files.join('\n')}`;
      }

      // If path is a directory (ends with /), list contents
      if (path.endsWith('/')) {
        const { data, error } = await supabase
          .from('claude_memory_files')
          .select('file_path, updated_at')
          .eq('conversation_id', this.conversationId)
          .like('file_path', `${path}%`)
          .order('file_path', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
          return `Directory ${path} is empty.`;
        }

        const files = data.map(f => `${f.file_path} (modified: ${new Date(f.updated_at).toISOString()})`);
        return `Directory ${path} contents:\n${files.join('\n')}`;
      }

      // Otherwise, read specific file
      const { data, error } = await supabase
        .from('claude_memory_files')
        .select('content')
        .eq('conversation_id', this.conversationId)
        .eq('file_path', path)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return `File not found: ${path}`;
        }
        throw error;
      }

      return data.content;
    } catch (error) {
      logger.error('[Memory Tool] View error:', error);
      return `Error reading ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Create command - create or overwrite a file
   * @param path - File path to create
   * @param content - Content to write
   */
  async create(path: string, content: string): Promise<string> {
    try {
      const supabase = await getSupabaseClient();

      // Validate path
      if (!path || path === '/') {
        return 'Error: Cannot create file at root. Please specify a file path like /filename.txt';
      }

      // Upsert (create or update)
      const { error } = await supabase
        .from('claude_memory_files')
        .upsert({
          conversation_id: this.conversationId,
          file_path: path,
          content,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'conversation_id,file_path',
        });

      if (error) throw error;

      logger.log(`[Memory Tool] Created/updated file: ${path} (${content.length} chars)`);
      return `Successfully created/updated ${path}`;
    } catch (error) {
      logger.error('[Memory Tool] Create error:', error);
      return `Error creating ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Edit command - update file using string replacement
   * @param path - File path to edit
   * @param oldStr - String to find
   * @param newStr - String to replace with
   */
  async edit(path: string, oldStr: string, newStr: string): Promise<string> {
    try {
      const supabase = await getSupabaseClient();

      // Read current content
      const { data, error: readError } = await supabase
        .from('claude_memory_files')
        .select('content')
        .eq('conversation_id', this.conversationId)
        .eq('file_path', path)
        .single();

      if (readError) {
        return `Error: File not found: ${path}`;
      }

      // Replace string
      const newContent = data.content.replace(oldStr, newStr);

      if (newContent === data.content) {
        return `Warning: String "${oldStr}" not found in ${path}. No changes made.`;
      }

      // Update file
      const { error: updateError } = await supabase
        .from('claude_memory_files')
        .update({
          content: newContent,
          updated_at: new Date().toISOString(),
        })
        .eq('conversation_id', this.conversationId)
        .eq('file_path', path);

      if (updateError) throw updateError;

      logger.log(`[Memory Tool] Edited file: ${path}`);
      return `Successfully edited ${path}`;
    } catch (error) {
      logger.error('[Memory Tool] Edit error:', error);
      return `Error editing ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Insert command - add text at specific line
   * @param path - File path to edit
   * @param lineNumber - Line number to insert at (1-based)
   * @param text - Text to insert
   */
  async insert(path: string, lineNumber: number, text: string): Promise<string> {
    try {
      const supabase = await getSupabaseClient();

      // Read current content
      const { data, error: readError } = await supabase
        .from('claude_memory_files')
        .select('content')
        .eq('conversation_id', this.conversationId)
        .eq('file_path', path)
        .single();

      if (readError) {
        return `Error: File not found: ${path}`;
      }

      // Split into lines
      const lines = data.content.split('\n');

      // Validate line number
      if (lineNumber < 1 || lineNumber > lines.length + 1) {
        return `Error: Line number ${lineNumber} out of range (1-${lines.length + 1})`;
      }

      // Insert text (lineNumber is 1-based)
      lines.splice(lineNumber - 1, 0, text);

      // Update file
      const newContent = lines.join('\n');
      const { error: updateError } = await supabase
        .from('claude_memory_files')
        .update({
          content: newContent,
          updated_at: new Date().toISOString(),
        })
        .eq('conversation_id', this.conversationId)
        .eq('file_path', path);

      if (updateError) throw updateError;

      logger.log(`[Memory Tool] Inserted text at line ${lineNumber} in ${path}`);
      return `Successfully inserted text at line ${lineNumber} in ${path}`;
    } catch (error) {
      logger.error('[Memory Tool] Insert error:', error);
      return `Error inserting into ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Delete command - remove file or directory
   * @param path - File or directory path to delete
   */
  async delete(path: string): Promise<string> {
    try {
      const supabase = await getSupabaseClient();

      if (!path || path === '/') {
        return 'Error: Cannot delete root directory. Please specify a file or subdirectory.';
      }

      // If path ends with /, delete all files in that directory
      if (path.endsWith('/')) {
        const { error } = await supabase
          .from('claude_memory_files')
          .delete()
          .eq('conversation_id', this.conversationId)
          .like('file_path', `${path}%`);

        if (error) throw error;

        logger.log(`[Memory Tool] Deleted directory: ${path}`);
        return `Successfully deleted directory ${path}`;
      }

      // Otherwise, delete specific file
      const { error } = await supabase
        .from('claude_memory_files')
        .delete()
        .eq('conversation_id', this.conversationId)
        .eq('file_path', path);

      if (error) throw error;

      logger.log(`[Memory Tool] Deleted file: ${path}`);
      return `Successfully deleted ${path}`;
    } catch (error) {
      logger.error('[Memory Tool] Delete error:', error);
      return `Error deleting ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Rename command - move/rename file
   * @param oldPath - Current file path
   * @param newPath - New file path
   */
  async rename(oldPath: string, newPath: string): Promise<string> {
    try {
      const supabase = await getSupabaseClient();

      // Read current file
      const { data, error: readError } = await supabase
        .from('claude_memory_files')
        .select('content')
        .eq('conversation_id', this.conversationId)
        .eq('file_path', oldPath)
        .single();

      if (readError) {
        return `Error: File not found: ${oldPath}`;
      }

      // Create at new path
      const { error: createError } = await supabase
        .from('claude_memory_files')
        .insert({
          conversation_id: this.conversationId,
          file_path: newPath,
          content: data.content,
        });

      if (createError) throw createError;

      // Delete old path
      const { error: deleteError } = await supabase
        .from('claude_memory_files')
        .delete()
        .eq('conversation_id', this.conversationId)
        .eq('file_path', oldPath);

      if (deleteError) throw deleteError;

      logger.log(`[Memory Tool] Renamed ${oldPath} to ${newPath}`);
      return `Successfully renamed ${oldPath} to ${newPath}`;
    } catch (error) {
      logger.error('[Memory Tool] Rename error:', error);
      return `Error renaming ${oldPath}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Process a memory tool use request from Claude
   */
  async processToolUse(command: MemoryCommand, params: Record<string, any>): Promise<string> {
    logger.log(`[Memory Tool] Processing command: ${command}`, params);

    switch (command) {
      case 'view':
        return this.view(params.path || '/');
      
      case 'create':
        return this.create(params.path, params.content || '');
      
      case 'edit':
        return this.edit(params.path, params.old_str, params.new_str);
      
      case 'insert':
        return this.insert(params.path, params.line_number, params.text);
      
      case 'delete':
        return this.delete(params.path);
      
      case 'rename':
        return this.rename(params.old_path, params.new_path);
      
      default:
        return `Unknown memory command: ${command}`;
    }
  }
}

/**
 * Initialize memory context at conversation start
 * Returns formatted memory context for system prompt
 */
export async function loadMemoryContext(conversationId: string | null): Promise<string> {
  try {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('claude_memory_files')
      .select('file_path, content, updated_at')
      .eq('conversation_id', conversationId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      return `
<memory_context>
No memory files exist yet for this conversation. You can create memory files to remember important information across messages. Use the memory tool to create, view, edit, and manage memory files.
</memory_context>
`;
    }

    // Format memory files for context
    const memoryList = data.map(f => 
      `- ${f.file_path} (${f.content.length} chars, updated: ${new Date(f.updated_at).toLocaleDateString()})`
    ).join('\n');

    return `
<memory_context>
You have access to ${data.length} memory file${data.length === 1 ? '' : 's'} for this conversation:

${memoryList}

Use the memory tool to view, create, edit, or delete memory files as needed.
</memory_context>
`;
  } catch (error) {
    logger.error('[Memory Context] Error loading:', error);
    return '<memory_context>Error loading memory context</memory_context>';
  }
}

