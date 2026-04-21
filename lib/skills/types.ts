import { z } from 'zod';

export const SKILL_SCOPES = ['builtin', 'global', 'org', 'brand', 'user'] as const;
export type SkillScope = (typeof SKILL_SCOPES)[number];

export const WORKFLOW_TYPES = ['chat', 'durable_agent'] as const;
export type WorkflowType = (typeof WORKFLOW_TYPES)[number];

export const skillVariableSchema = z.object({
  name: z.string().min(1),
  required: z.boolean().optional().default(false),
  description: z.string().optional(),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
});
export type SkillVariable = z.infer<typeof skillVariableSchema>;

export const skillFrontmatterSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'name must be kebab-case (lowercase letters, digits, hyphens)'),
  display_name: z.string().optional(),
  description: z.string().min(10),
  icon: z.string().optional(),
  workflow_type: z.enum(WORKFLOW_TYPES).optional().default('chat'),
  model_preference: z.string().optional(),
  tools: z.array(z.string()).optional().default([]),
  variables: z.array(skillVariableSchema).optional().default([]),
  resources: z.array(z.string()).optional().default([]),
});
export type SkillFrontmatter = z.infer<typeof skillFrontmatterSchema>;

export interface Skill {
  id: string;
  slug: string;
  scope: SkillScope;
  orgId: string | null;
  brandId: string | null;
  userId: string | null;
  frontmatter: SkillFrontmatter;
  body: string;
  /** absolute filesystem path for builtin skills, null for DB-backed rows */
  sourcePath: string | null;
  isBuiltin: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SkillResource {
  path: string;
  content: string;
}

export interface SkillContext {
  userId: string;
  orgId: string | null;
  brandId: string | null;
}

export interface SkillDiscoveryEntry {
  slug: string;
  name: string;
  description: string;
  displayName: string;
  icon?: string;
}
