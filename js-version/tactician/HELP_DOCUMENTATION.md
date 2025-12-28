# Tactician CLI - Help Documentation (MVP)

## Core Concept

Tactician helps you decompose software project goals into a task DAG using reusable tactics. **The CLI manages the task graph only** - it doesn't execute tasks, it helps you plan them.

When you apply a tactic, it creates new nodes in your project graph. Those nodes become goals that can themselves be decomposed further.

---

## Installation

```bash
npm install -g tactician-cli

# Initialize a project
tactician init

# Creates:
# .tactician/
#   ├── project.yaml       # Current project DAG
#   └── tactics.yaml       # Tactic registry
```

---

## `tactician graph`

View the current project task graph.

### Usage
```bash
tactician graph [goal-id]
```

### Arguments
- `goal-id` - (optional) Show subgraph for specific goal only

### Examples
```bash
# Show full project
tactician graph

# Show subgraph for specific goal
tactician graph crocodile_frontend
```

### Output
```
🎯 crocodile_domestication_system
  │
  ├─ 🎯 crocodile_backend [backend_application]
  │   ├─ ✓ requirements_document
  │   ├─ ✓ technical_specification
  │   ├─ ✓ data_model
  │   ├─ ⏳ api_specification (READY)
  │   └─ ⏳ backend_code (BLOCKED: api_specification)
  │
  └─ 🎯 crocodile_frontend [frontend_application]
      ├─ ✓ requirements_document (shared)
      ├─ ⏳ api_specification (READY - shared)
      └─ ⏳ frontend_code (BLOCKED: api_specification)

Legend: ✓=complete ⏳=pending 🎯=goal
```

---

## `tactician goals`

List open (incomplete) goals.

### Usage
```bash
tactician goals
```

### Output
```
Open Goals (3):

⏳ api_specification [READY]
   Output: api_specification
   Blocks: backend_code, frontend_code
   Dependencies: ✓ technical_specification

⏳ backend_code [BLOCKED]
   Output: backend_code
   Dependencies: ⏳ api_specification, ✓ data_model

⏳ frontend_code [BLOCKED]
   Output: frontend_code  
   Dependencies: ⏳ api_specification, ✓ react_specification
```

---

## `tactician search`

Search for applicable tactics. **This is the core of Tactician** - finding the right tactic to decompose your goals.

### Usage
```bash
tactician search [options]
```

### Options
```
-g, --goal <id>          Search for specific goal
-k, --keywords <words>   Keyword search (comma-separated)
-t, --tags <tags>        Filter by tags (comma-separated)
--type <type>            Filter by tactic type
--ready                  Show only tactics with all dependencies met
--with-premises          Include tactics that introduce new premise goals
--show-subtasks          Show subtask breakdown for complex tactics
```

### Examples
```bash
# Search for any applicable tactics (shows ready tactics for all open goals)
tactician search

# Show all possible tactics, even blocked ones
tactician search --with-premises

# Search for specific goal
tactician search --goal crocodile_frontend

# Search by keywords
tactician search --keywords "react,component"

# Search by tags
tactician search --tags llm-assisted,frontend

# Find all tactics that can start now
tactician search --ready

# Show tactics with their subtask breakdown
tactician search --show-subtasks

# Find coding strategies specifically
tactician search --type llm_coding_strategy

# Combine filters
tactician search --goal frontend_code --ready --show-subtasks
```

### Output (default)
```
Found 3 tactics:

design_api → api_specification
  Type: team_activity
  Status: ✓ READY
  Match: ✓ technical_specification
  Blocks: backend_code, frontend_code [CRITICAL PATH]
  Tags: design, api, architecture

implement_database → database_schema
  Type: software_implementation
  Status: ✓ READY
  Match: ✓ data_model
  Tags: backend, database

implement_react_screens → frontend_code
  Type: llm_coding_strategy
  Status: ⏳ BLOCKED
  Match: ✓ react_specification, ⏳ api_specification
  Premises: react_guidelines_doc, api_examples (would introduce)
  Subtasks: 4 nodes
  Tags: react, frontend, llm-assisted
```

### Output with `--show-subtasks`
```
Found 1 tactic:

implement_react_screens → frontend_code
  Type: llm_coding_strategy
  Status: ⏳ BLOCKED (needs: api_specification)
  Match: ✓ react_specification, ⏳ api_specification
  Premises: ⏳ react_guidelines_doc, ⏳ api_examples (would introduce)
  
  Subtasks (4 nodes):
    1. analyze_context_for_screens
       Output: react_screens_analysis
       Type: analysis
       
    2. design_react_components
       Output: react_component_design
       Type: design
       Depends on: react_screens_analysis
       
    3. user_review_checkpoint
       Output: review_approval
       Type: human_review
       Depends on: react_component_design, react_screens_analysis
       ⚠️  Blocking (requires human input)
       
    4. implement_components
       Output: frontend_code
       Type: implementation
       Depends on: review_approval, react_component_design
  
  Model: claude-sonnet-4-5-20250929
  References: /docs/react-guidelines.md, /examples/api-calls/
  Tags: react, frontend, llm-assisted, multi-stage
```

### Output with `--keywords`
```bash
$ tactician search --keywords "api,rest,endpoints"

Searching: "api, rest, endpoints"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Found 4 tactics:

design_api → api_specification
  Type: team_activity
  Status: ✓ READY
  Match: ✓ technical_specification
  Relevance: 0.95 (exact match: "api")
  
implement_crud_endpoints → api_endpoints_code
  Type: llm_coding_strategy
  Status: ⏳ BLOCKED (needs: api_specification)
  Match: ✓ api_specification, ✓ data_model
  Relevance: 0.92 (matches: "api", "endpoints")
  Subtasks: 3 nodes

write_api_docs → api_documentation
  Type: document
  Status: ⏳ BLOCKED (needs: api_specification)
  Match: ✓ api_specification
  Relevance: 0.88 (matches: "api")

implement_backend → backend_code
  Type: software_implementation
  Status: ⏳ BLOCKED (needs: api_specification)
  Match: ✓ api_specification, ✓ data_model
  Relevance: 0.72 (partial match: "api")
```

### Search Ranking

Tactics are ranked by:
1. **Dependency status** - Ready tactics rank highest
2. **Critical path** - Tactics that unblock multiple goals
3. **Relevance** - Keyword/semantic match quality
4. **Goal alignment** - Matches your specified goal

### Interactive Search Flow

```bash
# Start broad
$ tactician search
Found 8 tactics (3 ready, 5 blocked)

# Narrow down
$ tactician search --ready
Found 3 tactics

# Focus on specific goal
$ tactician search --goal frontend_code --ready
Found 0 ready tactics

# Relax to see what's blocking
$ tactician search --goal frontend_code
Found 2 tactics (both blocked by: api_specification)

# Find what can unblock
$ tactician search --keywords "api"
Found design_api (READY) - would unblock 2 goals

# See the full workflow
$ tactician search design_api --show-subtasks
```

---

## `tactician apply`

Apply a tactic to decompose a goal. This **creates new nodes** in the project graph.

### Usage
```bash
tactician apply <tactic-id>
```

### Arguments
- `tactic-id` - ID of the tactic to apply

### Examples
```bash
# Apply a simple tactic
tactician apply design_api

# Apply a tactic with subtasks
tactician apply implement_react_screens
```

### Output for Simple Tactic
```bash
$ tactician apply design_api

Applying: design_api
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Produces: api_specification
Match: ✓ technical_specification

This will create:
  • api_specification (document, pending)

This will unblock:
  • backend_code
  • frontend_code

Apply? [y/n] y

✓ Created node: api_specification (pending)
✓ Updated dependencies

Summary:
  Nodes created: 1
  Goals unblocked: 2
```

### Output for Tactic with Subtasks
```bash
$ tactician apply implement_react_screens

Applying: implement_react_screens
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Type: llm_coding_strategy
Produces: frontend_code
Match: ✓ react_specification, ⏳ api_specification

⚠️  Missing dependency: api_specification
    This tactic introduces it as a new goal.

This will create 5 nodes:
  • api_specification (document, pending)
  • react_screens_analysis (analysis, pending)
  • react_component_design (design, pending)
  • user_review_checkpoint (human_review, pending)
  • frontend_code (implementation, pending)

With dependencies:
  api_specification
    ↓
  react_screens_analysis
    ↓
  react_component_design
    ↓
  user_review_checkpoint
    ↓
  frontend_code

Apply? [y/n] y

✓ Created 5 nodes
✓ Established dependencies

Summary:
  Nodes created: 5
  New goals: 5 (all pending)
  
Next: Run 'tactician goals' to see new tasks
```

**Key Point:** Applying a tactic with subtasks creates all subtask nodes at once, but doesn't execute them. They become new pending goals in your graph.

---

## `tactician node`

Manual node management for edge cases.

### Usage
```bash
tactician node show <id>
tactician node add <id> <output-type>
tactician node edit <id> --status <status>
tactician node delete <id>
```

### Examples
```bash
# Show node details
tactician node show api_specification

# Add a node manually
tactician node add security_review security_assessment

# Mark a node complete
tactician node edit api_specification --status complete

# Delete a node
tactician node delete outdated_prototype
```

### Output for `show`
```
Node: api_specification
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Type:       document
Output:     api_specification
Status:     ⏳ pending
Created by: tactic:design_api

Dependencies:
  Match:    ✓ technical_specification

Blocks:
  • backend_code
  • frontend_code

Metadata:
  Created:  2024-01-15 14:32
  Modified: 2024-01-15 14:32
```

---

## `tactician tactics`

Manage the tactic registry.

### Usage
```bash
tactician tactics list
tactician tactics add <file>
tactician tactics show <id>
```

### Examples
```bash
# List all tactics
tactician tactics list

# Show details for a tactic
tactician tactics show implement_react_screens

# Add tactics from YAML file
tactician tactics add my-custom-tactics.yaml
```

### Output for `list`
```
Tactics Registry (18)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Planning (3):
  • gather_requirements
  • write_technical_spec
  • design_data_model

Design (3):
  • design_api
  • create_wireframes
  • llm_ascii_ui_design

Implementation (8):
  • implement_backend
  • implement_frontend
  • implement_database
  • implement_react_screens (→ 4 subtasks)
  • implement_crud_endpoints (→ 3 subtasks)

Testing (4):
  • write_unit_tests
  • write_integration_tests
```

### Output for `show`
```bash
$ tactician tactics show implement_react_screens

Tactic: implement_react_screens
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Type:        llm_coding_strategy
Output:      frontend_code
Tags:        react, frontend, llm-assisted, multi-stage

Description:
  Multi-stage LLM workflow to implement React screens with analysis,
  design, review, and implementation phases.

Dependencies:
  Match:     react_specification, api_specification
  Premises:  react_guidelines_doc, api_examples (introduces if missing)

Subtasks (4):
  1. analyze_context_for_screens (analysis)
  2. design_react_components (design)
  3. user_review_checkpoint (human_review) [BLOCKING]
  4. implement_components (implementation)

Data:
  Model:       claude-sonnet-4-5-20250929
  References:
    • /docs/react-guidelines.md (component patterns)
    • /examples/api-calls/ (API integration examples)
    • /src/components/shared/ (reusable components)
  
Registry: .tactician/tactics.yaml
```

---

## File Formats

### `.tactician/project.yaml`
```yaml
project:
  name: crocodile-domestication
  root_goal: crocodile_system

nodes:
  crocodile_system:
    type: project_artifact
    output: complete_system
    status: pending
    children: [crocodile_backend, crocodile_frontend]

  requirements_document:
    type: document
    output: requirements_document
    status: complete
    created_by: tactic:gather_requirements
    created_at: 2024-01-15T14:30:00Z

  api_specification:
    type: document
    output: api_specification
    status: pending
    dependencies:
      match: [technical_specification]
    blocks: [backend_code, frontend_code]
    created_by: tactic:design_api

  react_screens_analysis:
    type: analysis
    output: react_screens_analysis
    status: pending
    dependencies:
      match: [react_specification, api_specification]
    created_by: tactic:implement_react_screens
    parent: implement_react_screens
    data:
      model: claude-sonnet-4-5-20250929
      estimated_tokens: 3000
      prompts:
        - role: system
          content: "You are analyzing requirements for React screen implementation..."
        - role: user
          template: "Given: {{react_specification}}..."

  # ... more nodes
```

### `.tactician/tactics.yaml`
```yaml
# Simple tactic
- id: design_api
  type: team_activity
  output: api_specification
  match: [technical_specification]
  tags: [design, api, architecture]
  description: Design REST API endpoints and contracts

# Tactic with subtasks and rich data
- id: implement_react_screens
  type: llm_coding_strategy
  output: frontend_code
  match: [react_specification, api_specification]
  premises: [react_guidelines_doc, api_examples]
  tags: [react, frontend, llm-assisted, multi-stage]
  description: Multi-stage workflow for React screen implementation
  
  data:
    model: claude-sonnet-4-5-20250929
    
    references:
      - path: /docs/react-guidelines.md
        purpose: component patterns
      - path: /examples/api-calls/
        purpose: API integration examples
      - path: /src/components/shared/
        purpose: reusable components
    
    cli_utilities:
      - command: tree src/components -L 2
        when: before_analysis
      - command: npm run type-check
        when: after_implementation
    
    subtasks:
      - id: analyze_context_for_screens
        type: analysis
        output: react_screens_analysis
        depends_on: []
        data:
          estimated_tokens: 3000
          prompts:
            - role: system
              content: |
                You are analyzing requirements for React screen implementation.
                Review the provided references and identify relevant patterns.
            - role: user
              template: |
                Given:
                - React spec: {{react_specification}}
                - API spec: {{api_specification}}
                - Guidelines: {{react_guidelines_doc}}
                
                Create an analysis document covering:
                1. Relevant API endpoints
                2. Existing components to reuse
                3. New components needed
                4. State management strategy
        
      - id: design_react_components
        type: design
        output: react_component_design
        depends_on: [react_screens_analysis]
        data:
          estimated_tokens: 4000
          prompts:
            - role: system
              content: |
                You are designing React components based on analysis.
                Create detailed design specifications.
            - role: user
              template: |
                Using: {{react_screens_analysis}}
                
                Design:
                1. Component tree
                2. Prop definitions with TypeScript
                3. Redux slice design
                4. Side effects placement
        
      - id: user_review_checkpoint
        type: human_review
        output: review_approval
        depends_on: [react_component_design, react_screens_analysis]
        blocking: true
        data:
          prompt_to_user: |
            Please review:
            - Analysis: {{react_screens_analysis}}
            - Design: {{react_component_design}}
            
            Approve to continue or provide feedback.
          actions:
            approve: continue
            revise: loop_to_design
            reject: stop
        
      - id: implement_components
        type: implementation
        output: frontend_code
        depends_on: [review_approval, react_component_design]
        data:
          estimated_tokens: 8000
          cli_context:
            - tree src/components -L 2
            - cat src/store/index.ts
          prompts:
            - role: system
              content: |
                Implement React components following the approved design.
                Use TypeScript and follow guidelines.
            - role: user
              template: |
                Implement based on: {{react_component_design}}
                Reference: {{react_guidelines_doc}}
                
                Create:
                - Components (src/components/screens/*)
                - Redux slice (src/store/slices/*)
                - Tests (src/components/screens/__tests__/*)

# Tactic with different data structure
- id: implement_crud_endpoints
  type: llm_coding_strategy
  output: api_endpoints_code
  match: [api_specification, data_model]
  tags: [backend, api, crud]
  description: Implement CRUD endpoints with tests
  
  data:
    model: claude-sonnet-4-5-20250929
    
    references:
      - path: /docs/api-conventions.md
        purpose: REST conventions
      - path: /src/middleware/auth.ts
        purpose: authentication patterns
    
    subtasks:
      - id: analyze_endpoints_scope
        type: analysis
        output: endpoints_analysis
        data:
          estimated_tokens: 2500
          prompts:
            - role: user
              template: |
                API Spec: {{api_specification}}
                Data Model: {{data_model}}
                
                Analyze:
                1. CRUD operations needed
                2. Request/response schemas
                3. Validation rules
                4. Authorization requirements
      
      - id: generate_endpoint_code
        type: implementation
        output: api_endpoints_code
        depends_on: [endpoints_analysis]
        data:
          estimated_tokens: 7000
          cli_context:
            - grep -r 'router.get\|router.post' src/routes
          prompts:
            - role: user
              template: |
                Based on: {{endpoints_analysis}}
                
                Implement:
                - Route definitions
                - Controller methods
                - Request validation
                - Error handling
```

---

## Quick Start Workflow

```bash
# 1. Initialize
tactician init

# 2. Add initial goal manually
tactician node add crocodile_system complete_system

# 3. Search for what you can do
tactician search --ready

# 4. Apply tactics to decompose
tactician apply gather_requirements

# 5. Search again to see new options
tactician search --ready

# 6. Keep decomposing
tactician apply design_api

# 7. Check progress
tactician graph
tactician goals

# 8. Search for specific goals
tactician search --goal frontend_code --show-subtasks

# 9. When you've actually done work, mark nodes complete
tactician node edit requirements_document --status complete
```

---

## Core Commands Summary

| Command | Purpose |
|---------|---------|
| `tactician graph [goal-id]` | View project DAG |
| `tactician goals` | List open goals |
| `tactician search [options]` | **Find applicable tactics** |
| `tactician apply <tactic-id>` | Apply tactic (creates nodes) |
| `tactician node show <id>` | Show node details |
| `tactician node edit <id> --status <status>` | Update node |
| `tactician tactics list` | List available tactics |
| `tactician tactics show <id>` | Show tactic details |
