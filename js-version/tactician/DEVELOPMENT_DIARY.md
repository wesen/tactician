# Tactician CLI - Development Diary

## Phase 1: Setup (2024-12-28)

### What I'm Building
A CLI tool that helps decompose software projects into task DAGs using reusable tactics, inspired by theorem provers.

### Key Design Decisions

**Technology Stack:**
- Node.js for the CLI (user prefers Golang/Bubbletea for TUIs, but this is primarily a CLI tool)
- better-sqlite3 for database operations
- commander for CLI parsing
- yaml for data serialization
- chalk for colored output
- ora for loading spinners

**Database Architecture:**
- Two SQLite databases: `tactics.db` (global registry) and `project.db` (project-specific DAG)
- In-memory operations for speed, persist to disk after changes
- YAML export/import for portability (user preference)

**File Structure:**
```
src/
  commands/     - One file per CLI verb (user preference)
  db/           - Database schema and access
  llm/          - LLM reranking integration
  utils/        - Helper functions
```

### Progress
- ✅ Installed sqlite3 CLI tool
- ✅ Initialized npm project
- ✅ Installed dependencies: better-sqlite3, commander, yaml, chalk, ora
- ✅ Created directory structure

### Next Steps
1. Implement database schema and core data access layer
2. Create comprehensive default tactics library
3. Implement deterministic commands (init, graph, goals, node)
4. Build smoke tests for basic functionality

### Notes
- Following user's example scenarios closely - they show YAML structure and CLI output format
- Need to support both simple tactics (one node) and rich tactics (multiple subtasks)
- Premise system is key: optional dependencies that get introduced as new goals if missing


## Phase 3: Database Layer (2024-12-28)

### What I Built

**ProjectDB (`src/db/project.js`):**
- SQLite schema with `project`, `nodes`, and `edges` tables
- CRUD operations for nodes and edges
- Dependency tracking (getDependencies, getBlockedBy)
- YAML export/import for portability
- Cascade delete for edges when nodes are removed

**TacticsDB (`src/db/tactics.js`):**
- SQLite schema with `tactics`, `tactic_dependencies`, and `tactic_subtasks` tables
- Support for both `match` (required) and `premise` (optional) dependencies
- Subtask storage with dependency chains
- Search by type, tags, and keywords
- YAML import/export

**Helpers (`src/utils/helpers.js`):**
- Path utilities for `.tactician/` directory
- Status computation (ready/blocked based on dependencies)
- Colored output helpers using chalk
- Node filtering by status

### Design Decisions

**Why separate tables for dependencies and subtasks?**
- Allows flexible querying (e.g., "find all tactics that need X")
- Easier to add new dependency types later
- Normalized structure

**Why YAML export/import?**
- User preference for human-readable, portable format
- Matches the example scenarios
- Easy to version control

**Status computation:**
- `complete`: Explicitly marked by user
- `ready`: All dependencies are complete
- `blocked`: At least one dependency is not complete
- `pending`: Default state for new nodes

### What Works
- ✅ Database schemas created and tested
- ✅ YAML import/export for both databases
- ✅ Dependency graph traversal
- ✅ Status computation logic

### Next Steps
1. Create comprehensive default tactics library
2. Implement init command
3. Test database layer with smoke tests


## Phase 4: Tactics Library & Action Logging (2024-12-28)

### Added Action Logging System

**New Features in ProjectDB:**
- `action_log` table to track all user actions
- `logAction()` method to record actions with timestamp, details, node_id, tactic_id
- `getActionLog()` to retrieve history with optional filters (limit, since)
- `getSessionSummary()` to generate statistics for a work session

**Action Types:**
- `node_created` - When a new node is added
- `node_updated` - When node properties change
- `node_completed` - When a node is marked complete
- `node_deleted` - When a node is removed
- `tactic_applied` - When a tactic is applied to create nodes
- `project_initialized` - When init command runs

This will enable:
- Session summaries ("You created 5 nodes, completed 3 tasks, applied 2 tactics")
- Work history review
- Undo/redo capabilities (future enhancement)
- Audit trail for team projects

### Created Comprehensive Tactics Library

**70+ default tactics across categories:**
- Planning & Requirements (4 tactics)
- Architecture & Design (6 tactics)
- Backend Development (8 tactics including 2 rich LLM-assisted tactics)
- Frontend Development (7 tactics including 1 rich multi-stage tactic)
- Testing (5 tactics)
- DevOps & Infrastructure (5 tactics)
- Documentation (4 tactics)
- Security & Compliance (4 tactics)
- Data & Analytics (3 tactics)
- Mobile (3 tactics)
- Optimization (3 tactics)
- Maintenance (3 tactics)

**Rich Tactics with Subtasks:**
1. `implement_crud_endpoints` - 3 subtasks (analysis → implementation → tests)
2. `implement_react_screens` - 4 subtasks (analysis → design → review → implementation)

These encode best practices and provide LLM prompts for execution.

### Design Decisions

**Why so many tactics?**
- User requested "be expansive, the more the better"
- Covers full software lifecycle
- Provides concrete examples for search/ranking
- Real projects can use subset + add custom tactics

**Tactic categories align with real workflows:**
- Start with planning (gather_requirements)
- Move to design (architecture, data model, API)
- Implement (backend, frontend)
- Test and deploy
- Maintain and optimize

### Next Steps
1. Implement init command to create .tactician/ and load default tactics
2. Implement node command for manual node management
3. Implement graph command to visualize DAG
4. Implement goals command to show open tasks
5. Implement history command to show action log
6. Create smoke tests


## Phase 5-6: CLI Commands & Smoke Tests (2024-12-28)

### What I Built

**CLI Commands Implemented:**
1. `init` - Initialize project, create databases, load default tactics
2. `node add/show/edit/delete` - Manual node management
3. `graph` - Visualize task DAG with tree structure
4. `goals` - List open tasks, sorted by ready/blocked status
5. `history` - View action log with optional summary

**Main CLI Entry Point (`src/index.js`):**
- Uses commander for argument parsing
- One file per verb (user preference)
- Proper help text and command descriptions

**Smoke Test (`smoke-tests/test-basic.sh`):**
- 12 comprehensive tests covering all basic functionality
- Tests init, node operations, graph, goals, history
- Validates database integrity
- Checks that 54 tactics were loaded

### Issues Fixed

**Issue 1: Chalk v5 ESM incompatibility**
- Chalk v5 is ESM-only, doesn't work with CommonJS require()
- Solution: Downgraded to chalk@4 which supports CommonJS
- Lesson: Check package compatibility with module system

**Issue 2: Goals command destructuring bug**
- Was trying to destructure `{ node, actualStatus, deps, blocks }` from nodeInfo
- But nodeInfo IS the node with those properties added
- Solution: Access properties directly from nodeInfo
- Lesson: Be careful with object spreading and property access

### What Works
- All 12 smoke tests passing
- Init creates databases and loads 54 tactics
- Node CRUD operations work correctly
- Graph visualization shows tree structure with status
- Goals command shows ready vs blocked tasks
- History command shows detailed log and summary
- Action logging tracks all operations

### Design Observations

**Graph visualization approach:**
- Build tree from edges, starting at root
- Use Unicode box-drawing characters for tree structure
- Color-code status (green=complete, yellow=pending, cyan=ready)
- Show CRITICAL PATH when node blocks multiple others
- Handles cycles by tracking visited nodes

**Goals command prioritization:**
- Ready tasks shown first (can work on immediately)
- Blocked tasks shown after with dependency info
- Critical path highlighted
- Clear visual separation between ready and blocked

**History command flexibility:**
- Can show detailed log or summary
- Supports time filters (--since 1h, 2d, 30m)
- Icons for each action type
- Chronological order (oldest first)

### Next Steps
1. Implement search command with ranking algorithm
2. Implement apply command to apply tactics
3. Implement tactics management commands
4. Add LLM reranking
5. Walk through real project example


## Phase 7-10: Search, Apply, LLM Reranking & Real Project (2024-12-28)

### Search Implementation

**Multi-Factor Ranking Algorithm:**
1. **Dependency Status** (±1000 points) - Ready tactics get huge boost
2. **Critical Path Impact** (×50) - Count nodes that would be unblocked
3. **Keyword Relevance** (×10) - Match against id (10pts), tags (5pts), description (2pts)
4. **Goal Alignment** (×5) - Direct output match (20pts), dependency match (10pts)

**Key Design Decisions:**
- Use Sets to avoid duplicate dependencies when checking match + premises
- Skip premises that are already in match list
- Rank first by heuristics, then optionally rerank with LLM
- Show dependency status clearly (satisfied, missing, can introduce)

### Apply Command Implementation

**Features:**
- Check dependencies before applying
- Show what nodes will be created
- Display dependency structure for subtasks
- Confirmation prompt (skip with --yes)
- Force flag to apply despite missing dependencies
- Create edges automatically based on tactic dependencies

**Bug Fixed:**
- Subtasks were nested in `data.subtasks` in YAML but code expected top-level
- Solution: Check both locations when loading tactics
- Dependency checking was listing duplicates
- Solution: Use Sets instead of arrays for deduplication

### LLM Reranking

**Implementation:**
- Optional via `--llm-rerank` flag
- Uses OpenAI API (configurable model)
- Builds rich context: project state, completed/pending nodes
- Sends top N tactics (default 10) to avoid token costs
- Fallback to heuristic ranking on error
- Verbose mode shows prompt and response

**Prompt Design:**
- Project state summary (completed/pending outputs)
- User's search query
- List of candidate tactics with full details
- Request JSON array response for easy parsing
- Emphasize semantic match and workflow logic

**Bug Fixed:**
- Commander converts `--llm-rerank` to `llmRerank` in options
- Search command needed to accept query as first parameter, not in options
- Fixed: `async function searchCommand(query, options = {})`

### Real Project Walkthrough

**Scenario: Task Management SaaS**
- Start with root goal
- Apply gather_requirements → design_data_model → design_api
- Apply rich tactic (implement_crud_endpoints) with 3 subtasks
- Complete subtasks one by one, watching workflow progress
- Use LLM reranking to find database-related tactics

**Observations:**
- The workflow feels natural and intuitive
- Goals command clearly shows what's ready vs blocked
- Graph visualization helps understand dependencies
- History summary provides good session overview
- LLM reranking noticeably improves relevance

**What Works Well:**
- Dependency tracking is accurate
- Subtask expansion creates proper DAG
- Status updates cascade correctly (unblocking dependent nodes)
- Search ranking puts relevant tactics at top
- Apply command provides good preview before creating nodes

**Potential Improvements:**
- Could add `--auto-apply` mode to skip confirmations
- Could cache LLM reranking results for same query
- Could add `tactician suggest` command that auto-applies top ready tactic
- Could visualize critical path in graph
- Could add time estimates based on tactic type

### Statistics
- 54 default tactics loaded
- Real walkthrough: 13 actions, 6 completions, 5 tactics applied
- All smoke tests passing
- LLM reranking working with gpt-4.1-mini
