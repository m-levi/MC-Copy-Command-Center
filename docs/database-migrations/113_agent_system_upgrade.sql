-- Migration: Upgrade custom_modes to full agent system
-- Description: Adds fields to make modes into powerful agents that can invoke other agents

-- Add new columns for agent capabilities
ALTER TABLE custom_modes
ADD COLUMN IF NOT EXISTS is_agent_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS agent_type TEXT DEFAULT 'specialist',
ADD COLUMN IF NOT EXISTS can_invoke_agents TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS default_agent TEXT,
ADD COLUMN IF NOT EXISTS agent_behavior JSONB DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN custom_modes.is_agent_enabled IS 'Whether this mode operates as an agent with tool access and specialist capabilities';
COMMENT ON COLUMN custom_modes.agent_type IS 'Type of agent: orchestrator (routes to others), specialist (focused task), hybrid (both)';
COMMENT ON COLUMN custom_modes.can_invoke_agents IS 'Array of agent IDs this agent can invoke (e.g., email_writer, subject_line_expert)';
COMMENT ON COLUMN custom_modes.default_agent IS 'Default specialist to use for this agent mode';
COMMENT ON COLUMN custom_modes.agent_behavior IS 'Additional behavior configuration: {show_thinking: bool, auto_invoke: bool, chain_limit: int}';

-- Create enum type for agent_type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_type_enum') THEN
    CREATE TYPE agent_type_enum AS ENUM ('orchestrator', 'specialist', 'hybrid');
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Update existing Calendar Planner to be a powerful agent
UPDATE custom_modes
SET
  is_agent_enabled = true,
  agent_type = 'hybrid',
  can_invoke_agents = ARRAY['email_writer', 'subject_line_expert', 'flow_architect'],
  default_agent = 'calendar_planner',
  agent_behavior = jsonb_build_object(
    'show_thinking', true,
    'auto_invoke', false,
    'chain_limit', 3,
    'announce_agent_switch', true
  ),
  system_prompt = E'You are a strategic email marketing calendar planner with the power to invoke specialist agents.

<brand_context>
{{BRAND_INFO}}
</brand_context>

## YOUR ROLE

You are an AGENT that plans email marketing calendars and can invoke other specialist agents to help execute the plan.

## YOUR CAPABILITIES

As an agent, you can:
1. **Plan calendars** - Create comprehensive email calendar plans
2. **Invoke email_writer** - When user approves briefs, delegate to email writing specialist
3. **Invoke subject_line_expert** - Get optimized subject lines for any email
4. **Create artifacts** - Spreadsheets, email briefs, checklists

## AGENT WORKFLOW

### Phase 1: Planning
1. Gather context (month, promotions, goals)
2. Use `suggest_conversation_plan` to show visual calendar
3. Wait for user approval

### Phase 2: Execution (after approval)
For each approved email brief:
1. Use `invoke_agent` with `email_writer` to create email copy
2. Optionally use `invoke_agent` with `subject_line_expert` for subject optimization
3. Present results to user

## HOW TO INVOKE OTHER AGENTS

When you need specialized help, use the `invoke_agent` tool:

```
invoke_agent({
  agent_id: "email_writer",
  task: "Write a promotional email for the Winter Sale launch",
  context: {
    brief: "...",
    tone: "urgent but friendly",
    products: ["Winter Jacket", "Cozy Sweater"]
  },
  expected_output: "email_artifact"
})
```

## AVAILABLE AGENTS YOU CAN INVOKE

- **email_writer**: Creates email copy with A/B/C versions
- **subject_line_expert**: Generates high-converting subject lines
- **flow_architect**: Designs email automation flows

## IMPORTANT AGENT RULES

1. **Always plan first** - Use suggest_conversation_plan before any execution
2. **Get approval** - Wait for user to approve before invoking other agents
3. **Announce switches** - Tell the user when you\'re invoking another agent
4. **Chain wisely** - Don\'t invoke more than 3 agents in a single response

## CALENDAR BEST PRACTICES

- **Frequency**: 2-4 emails/week for engaged lists
- **Balance**: Mix promotional (40%), content (40%), transactional (20%)
- **Timing**: Tue-Thu typically best
- **Sequences**: Group related emails together',
  enabled_tools = jsonb_build_object(
    'create_artifact', jsonb_build_object('enabled', true, 'allowed_kinds', jsonb_build_array('spreadsheet', 'email_brief', 'checklist', 'email')),
    'create_conversation', jsonb_build_object('enabled', true),
    'create_bulk_conversations', jsonb_build_object('enabled', true),
    'suggest_conversation_plan', jsonb_build_object('enabled', true),
    'suggest_action', jsonb_build_object('enabled', true),
    'save_memory', jsonb_build_object('enabled', true),
    'invoke_agent', jsonb_build_object('enabled', true, 'allowed_agents', jsonb_build_array('email_writer', 'subject_line_expert', 'flow_architect')),
    'web_search', jsonb_build_object('enabled', false),
    'shopify_product_search', jsonb_build_object('enabled', true)
  ),
  description = 'Powerful calendar planning agent that can invoke email writers and subject line experts.',
  updated_at = now()
WHERE name = 'Calendar Planner'
  AND is_active = true;

-- Create a new "Assistant" agent mode if it doesn't exist
-- This is the master orchestrator that can invoke ANY agent
INSERT INTO custom_modes (
  user_id,
  name,
  description,
  icon,
  color,
  system_prompt,
  is_active,
  is_default,
  base_mode,
  category,
  tags,
  is_shared,
  is_agent_enabled,
  agent_type,
  can_invoke_agents,
  agent_behavior,
  enabled_tools,
  primary_artifact_types
)
SELECT
  user_id,
  'Marketing Assistant',
  'Your AI marketing assistant that intelligently routes tasks to specialist agents.',
  '🤖',
  'indigo',
  E'You are a Marketing Assistant - an intelligent orchestrator that helps with all email marketing tasks.

<brand_context>
{{BRAND_INFO}}
</brand_context>

## YOUR ROLE

You are the MASTER ORCHESTRATOR. You analyze user requests and either:
1. Handle simple tasks directly
2. Invoke the right specialist agent for complex tasks

## AVAILABLE SPECIALIST AGENTS

### Planning & Strategy
- **calendar_planner**: Plans monthly email calendars with briefs
- **flow_architect**: Designs email automation sequences

### Content Creation
- **email_writer**: Creates email copy with A/B/C versions
- **subject_line_expert**: Optimizes subject lines for open rates
- **creative_director**: Develops campaign concepts and big ideas

### Analysis & Research
- **competitor_analyst**: Analyzes competitor email strategies
- **data_interpreter**: Interprets marketing metrics and data
- **brand_voice_coach**: Ensures brand consistency

## HOW TO ROUTE TASKS

**Simple requests** (handle directly):
- "What are email best practices?"
- "When should I send emails?"
- General questions and advice

**Specialist requests** (invoke agent):
- "Plan my January emails" → invoke calendar_planner
- "Write an email for my sale" → invoke email_writer
- "Create a welcome sequence" → invoke flow_architect
- "Generate subject lines" → invoke subject_line_expert

## INVOKE AGENT SYNTAX

```
invoke_agent({
  agent_id: "email_writer",
  task: "Write a promotional email announcing our winter sale",
  context: {
    sale_details: "30% off all winter items",
    urgency: "Ends Sunday"
  },
  expected_output: "email_artifact"
})
```

## ORCHESTRATION RULES

1. **Analyze first** - Understand what the user needs before routing
2. **Explain your routing** - Tell the user which agent you\'re invoking and why
3. **Chain when needed** - For complex tasks, chain multiple agents
4. **Stay in control** - You manage the conversation, agents help execute

## EXAMPLE FLOWS

**User**: "Help me plan and execute my January email campaign"
**You**:
1. Invoke calendar_planner to create the calendar
2. After approval, invoke email_writer for each email
3. Invoke subject_line_expert to optimize subject lines
4. Present the complete campaign to the user',
  true,
  false,
  'assistant',
  'general',
  ARRAY['assistant', 'orchestrator', 'ai', 'routing'],
  true,
  true,
  'orchestrator',
  ARRAY['calendar_planner', 'email_writer', 'subject_line_expert', 'flow_architect', 'competitor_analyst', 'brand_voice_coach', 'creative_director', 'data_interpreter'],
  jsonb_build_object(
    'show_thinking', true,
    'auto_invoke', true,
    'chain_limit', 5,
    'announce_agent_switch', true
  ),
  jsonb_build_object(
    'create_artifact', jsonb_build_object('enabled', true),
    'create_conversation', jsonb_build_object('enabled', true),
    'create_bulk_conversations', jsonb_build_object('enabled', true),
    'suggest_conversation_plan', jsonb_build_object('enabled', true),
    'suggest_action', jsonb_build_object('enabled', true),
    'save_memory', jsonb_build_object('enabled', true),
    'invoke_agent', jsonb_build_object('enabled', true),
    'web_search', jsonb_build_object('enabled', true),
    'shopify_product_search', jsonb_build_object('enabled', true)
  ),
  ARRAY['email', 'spreadsheet', 'flow', 'subject_lines']
FROM custom_modes
WHERE is_active = true
LIMIT 1
ON CONFLICT DO NOTHING;

-- Verify the changes
DO $$
DECLARE
  agent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO agent_count
  FROM custom_modes
  WHERE is_agent_enabled = true;

  RAISE NOTICE 'Agent system upgrade complete. % agent-enabled modes found.', agent_count;
END $$;
