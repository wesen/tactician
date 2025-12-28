# Tactician: Theorem Prover for Software Projects

## What is Tactician?

Tactician is a CLI tool that helps you decompose software projects into structured task graphs using reusable patterns called **tactics**, inspired by theorem provers like Lean.

Instead of proving mathematical theorems, you're "proving" you can build software artifacts by breaking them down into concrete, achievable tasks.

## Core Analogy: Curry-Howard for Software

In theorem proving:
- You have a **goal** (a theorem to prove)
- You apply **tactics** (proof strategies) 
- Tactics decompose goals into **subgoals**
- You continue until all subgoals are proven

In Tactician:
- You have a **goal** (a software artifact to build)
- You apply **tactics** (decomposition strategies)
- Tactics decompose goals into **subtasks** (smaller artifacts)
- You continue until all tasks are concrete and achievable

## The Task DAG

Your project is represented as a directed acyclic graph (DAG) where:

**Nodes** are artifacts you need to create:
- `requirements_document`
- `api_specification`
- `backend_code`
- `frontend_code`

**Edges** are dependencies:
- `backend_code` depends on `api_specification` and `data_model`
- `frontend_code` depends on `api_specification` and `react_specification`

Unlike traditional project management tools, Tactician focuses on **artifact dependencies**, not just task ordering.

## How Tactics Work

A **tactic** is a reusable pattern for decomposing a goal. It defines:

1. **What it produces** (output artifact type)
2. **What it needs** (required matching artifacts)
3. **What helps** (optional premise artifacts it can introduce)
4. **How to break it down** (subtasks it creates)

### Simple Tactic Example

```yaml
id: design_api
type: team_activity
output: api_specification
match: [technical_specification]
```

When you apply this tactic:
- Creates one node: `api_specification`
- Status: pending (you still need to do the work)
- Ready to start if `technical_specification` exists

### Rich Tactic Example

```yaml
id: implement_react_screens
type: llm_coding_strategy
output: frontend_code
match: [react_specification, api_specification]
premises: [react_guidelines_doc, api_examples]

subtasks:
  - analyze_context_for_screens → react_screens_analysis
  - design_react_components → react_component_design
  - user_review_checkpoint → review_approval
  - implement_components → frontend_code
```

When you apply this tactic:
- Creates 4 subtask nodes with dependencies
- If premises missing, adds them as new goals
- Each subtask becomes a concrete task to work on

## The Premise System

This is where Tactician differs from rigid planning tools.

A **premise** is an artifact that would be helpful but isn't strictly required. When a tactic references premises:

- If the premise exists → great, use it
- If the premise doesn't exist → introduce it as a new goal

**Example**: `implement_react_screens` works better with `react_guidelines_doc`, but can proceed without it. If you apply this tactic and the guidelines don't exist, Tactician adds "create react_guidelines_doc" as a new goal.

This allows tactics to be **helpful suggestions** rather than rigid requirements.

## Fuzzy Matching

Unlike theorem provers with strict type systems, Tactician uses fuzzy matching:

- **Keyword search**: "api", "react", "endpoints"
- **Semantic similarity**: Understanding that `api_specification` relates to `rest_endpoints`
- **Tag-based filtering**: `llm-assisted`, `frontend`, `testing`

The search engine ranks tactics by:
1. Dependency readiness (can it start now?)
2. Critical path impact (does it unblock other tasks?)
3. Semantic relevance (does it match what you're asking for?)

## Rich Node Types

Nodes can be more than just "task" or "artifact". Each type has its own data structure:

**analysis nodes** have:
```yaml
data:
  model: claude-sonnet-4-5-20250929
  estimated_tokens: 3000
  prompts: [...]
```

**human_review nodes** have:
```yaml
data:
  blocking: true
  prompt_to_user: "Please review..."
  actions:
    approve: continue
    revise: loop_back
```

**implementation nodes** have:
```yaml
data:
  references: [/docs/guidelines.md]
  cli_context: ["tree src/", "cat config.json"]
  prompts: [...]
```

This makes tactics **executable specifications** - they contain enough information to guide an LLM or developer through the work.

## Workflow

```
1. Start with high-level goal
   └─ "build crocodile_domestication_backend"

2. Search for applicable tactics
   └─ tactician search
   
3. Apply tactics to decompose
   └─ tactician apply gather_requirements
   └─ Creates: requirements_document (pending)

4. Continue decomposing
   └─ tactician search --ready
   └─ tactician apply design_api
   └─ Creates: api_specification (pending)

5. View the growing graph
   └─ tactician graph
   └─ See dependencies and blockers

6. When work is done, mark complete
   └─ tactician node edit api_specification --status complete
```

## What Tactician Does NOT Do

**Tactician does not execute tasks.** It's a planning and decomposition tool.

When you apply a tactic, it creates nodes in your graph - it doesn't write code, call APIs, or run commands. The `data` field in nodes (prompts, references, CLI commands) is **metadata for future execution**, not immediate action.

Think of it as generating a detailed project plan with all the context needed to execute each step, but leaving the execution to you, your team, or an LLM agent.

## Why This Approach?

**Traditional project management**: "Write backend code" → single task, unclear dependencies

**Tactician approach**: 
```
implement_backend
  ├─ requires: api_specification, data_model
  ├─ produces: backend_code
  └─ subtasks:
      ├─ analyze_endpoints_scope
      ├─ generate_boilerplate
      └─ implement_business_logic
```

Benefits:
- **Reusable patterns**: Tactics encode best practices
- **Clear dependencies**: Can't start until prerequisites exist
- **Flexible**: Premises allow "nice to have" without blocking
- **Rich context**: Each node carries execution metadata
- **Searchable**: Find relevant tactics via keywords, tags, types
- **Visual**: DAG shows critical path and blockers

## Integration with LLM Agents

Tactician is designed to work alongside LLM coding agents:

1. Tactician decomposes: "implement frontend" → subtasks with prompts
2. Agent executes: Uses prompts and references from node data
3. Human reviews: At human_review checkpoints
4. Mark complete: Update node status
5. Unblock next: More tasks become available

The `llm_coding_strategy` tactic type is specifically for multi-stage LLM workflows.

## Example: Full Decomposition

```
Goal: crocodile_domestication_system

Apply: gather_requirements
  Creates: requirements_document

Apply: write_technical_spec
  Requires: requirements_document
  Creates: technical_specification

Apply: design_data_model
  Requires: requirements_document
  Creates: data_model

Apply: design_api
  Requires: technical_specification
  Creates: api_specification
  
Apply: implement_react_screens
  Requires: react_specification, api_specification
  Premises: react_guidelines_doc (creates if missing)
  Creates subtasks:
    ├─ analyze_context → react_screens_analysis
    ├─ design_components → react_component_design
    ├─ user_review → review_approval [BLOCKING]
    └─ implement_code → frontend_code

Result: A detailed task DAG with clear dependencies,
        rich metadata for execution, and concrete next steps.
```

## Summary

Tactician brings the structure and rigor of theorem proving to software project planning. It helps you:

- **Decompose** complex projects systematically
- **Reuse** proven decomposition patterns (tactics)
- **Track** dependencies accurately  
- **Search** for the right next step
- **Collaborate** with clear artifact boundaries
- **Execute** with rich contextual metadata

It's not a build tool or task runner - it's a **project structure tool** that makes implicit dependencies explicit and turns vague goals into concrete, executable plans.
