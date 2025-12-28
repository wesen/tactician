# Tactician CLI: Implementation Plan

## 1. Introduction

This document outlines the implementation plan for the Tactician CLI, a tool for decomposing software project goals into a task dependency graph (DAG). The plan covers the project structure, database schema, CLI command implementation, and other key aspects of the project.

The core of the CLI will be built in Node.js, with data stored in two SQLite databases: one for the project-specific task graph and another for the global registry of tactics. The use of in-memory SQLite databases for operations will ensure fast and efficient processing of commands.

## 2. Project Structure

```
/home/ubuntu/tactician
├── .tactician/
│   ├── project.db       # SQLite DB for the current project's DAG
│   └── tactics.db         # SQLite DB for the tactic registry
├── src/
│   ├── commands/          # Implementation for each CLI command
│   │   ├── init.js
│   │   ├── graph.js
│   │   ├── goals.js
│   │   ├── search.js
│   │   ├── apply.js
│   │   ├── node.js
│   │   └── tactics.js
│   ├── db/                # Database schema and access logic
│   │   ├── project.js
│   │   └── tactics.js
│   ├── llm/               # LLM integration
│   │   ├── reranker.js    # LLM reranking logic
│   │   └── prompts.js     # Prompt templates
│   ├── utils/             # Helper functions
│   └── index.js           # Main CLI entry point
├── tests/
│   ├── commands/
│   └── utils/
├── package.json
└── README.md
```

## 3. Database Schema

We will use two separate SQLite databases to manage the project state and the tactic registry.

### 3.1. Tactic Registry Database Schema (`tactics.db`)

This database will store all available tactics. It will be initialized with a default set of tactics and can be extended by the user.

**`tactics` table:**

| Column | Type | Description |
|---|---|---|
| `id` | TEXT | Unique identifier for the tactic (e.g., `design_api`) |
| `type` | TEXT | Type of tactic (e.g., `team_activity`, `llm_coding_strategy`) |
| `output` | TEXT | The artifact this tactic produces |
| `description` | TEXT | A human-readable description of the tactic |
| `tags` | TEXT | Comma-separated list of tags for filtering |

**`tactic_dependencies` table:**

| Column | Type | Description |
|---|---|---|
| `tactic_id` | TEXT | Foreign key to `tactics.id` |
| `dependency_type` | TEXT | `match` or `premise` |
| `artifact_type` | TEXT | The type of artifact required (e.g., `technical_specification`) |

**`tactic_subtasks` table:**

| Column | Type | Description |
|---|---|---|
| `tactic_id` | TEXT | Foreign key to `tactics.id` |
| `subtask_id` | TEXT | Unique ID for the subtask within the tactic |
| `output` | TEXT | The artifact produced by the subtask |
| `type` | TEXT | The type of the subtask (e.g., `analysis`, `design`) |
| `depends_on` | TEXT | Comma-separated list of subtask IDs it depends on |
| `data` | TEXT | JSON object containing additional data (prompts, etc.) |

### 3.2. Project Database Schema (`project.db`)

This database will store the project's task graph.

**`nodes` table:**

| Column | Type | Description |
|---|---|---|
| `id` | TEXT | Unique identifier for the node (e.g., `api_specification`) |
| `type` | TEXT | Type of artifact (e.g., `document`, `analysis`) |
| `output` | TEXT | The specific output of the node |
| `status` | TEXT | `pending`, `complete`, `ready`, `blocked` |
| `created_by` | TEXT | The tactic that created this node |
| `created_at` | DATETIME | Timestamp of node creation |
| `parent_tactic` | TEXT | If part of a subtask, the parent tactic ID |
| `data` | TEXT | JSON object for rich node data |

**`edges` table:**

| Column | Type | Description |
|---|---|---|
| `source_node_id` | TEXT | The node that must be completed first |
| `target_node_id` | TEXT | The node that depends on the source node |

## 4. CLI Command Implementation

Each command will be implemented in its own file in `src/commands/`. The main executable will parse the command and delegate to the appropriate module.

### 4.1. `tactician init`

- Create the `.tactician` directory.
- Create the `project.db` and `tactics.db` SQLite databases with the defined schema.
- Populate `tactics.db` with a default set of tactics from an embedded YAML or JSON file.

### 4.2. `tactician graph [goal-id]`

- Load `project.db` into an in-memory database.
- Query the `nodes` and `edges` tables to build the full DAG.
- If `goal-id` is provided, traverse the graph to find the subgraph related to that goal.
- Format and print the graph to the console, using symbols for status and type.

### 4.3. `tactician goals`

- Load `project.db` into memory.
- Query for nodes where `status` is not `complete`.
- For each open goal, determine its status (`READY` or `BLOCKED`) by checking the status of its dependencies.
- Format and display the list of open goals with their dependencies and what they block.

### 4.4. `tactician search [options]`

- Load both `project.db` and `tactics.db` into memory.
- Get the list of open goals from the project graph.
- Filter tactics based on the provided options (`--goal`, `--keywords`, `--tags`, `--type`, `--ready`, `--with-premises`, `--llm-rerank`).
- For keyword search, use a combination of `LIKE` queries on the tactic's `id`, `description`, and `tags`, and a simple scoring mechanism.
- Rank the results based on the specified criteria: dependency status, critical path, relevance, and goal alignment.
- Display the ranked list of tactics.

### 4.5. `tactician apply <tactic-id>`

- Load both databases into memory.
- Fetch the specified tactic from the `tactics` database.
- Check if the tactic's dependencies are met in the current project graph.
- If the tactic has subtasks, create a new node for each subtask.
- If the tactic is simple, create a single new node.
- Add the new nodes and edges to the `nodes` and `edges` tables in the in-memory database.
- Write the changes from the in-memory database back to the `project.db` file.

### 4.6. `tactician node`

- `show <id>`: Query the `nodes` table for the specified node and display its details.
- `add <id> <output-type>`: Manually insert a new node into the `nodes` table.
- `edit <id> --status <status>`: Update the status of a node in the `nodes` table.
- `delete <id>`: Remove a node and its associated edges.

### 4.7. `tactician tactics`

- `list`: Query and display all tactics from the `tactics` database, grouped by type.
- `add <file>`: Parse a YAML file containing new tactics and insert them into the `tactics.db`.
- `show <id>`: Display the full details of a specific tactic, including its subtasks and dependencies.

## 5. Search Functionality

The `search` command is central to Tactician. The search and ranking algorithm will be implemented as follows:

1.  **Filtering**: Apply all user-provided filters (`--goal`, `--tags`, etc.) to get a candidate set of tactics.
2.  **Initial Scoring**:
    *   **Dependency Status**: `READY` tactics get the highest score.
    *   **Critical Path**: Score tactics based on how many currently blocked nodes they would unblock.
    *   **Relevance**: For keyword searches, assign a relevance score based on which fields match (e.g., `id` > `tags` > `description`) and the number of keywords that match.
    *   **Goal Alignment**: If a `--goal` is specified, tactics that produce an artifact that satisfies the goal's dependencies get a higher score.
3.  **Initial Ranking**: Sort the tactics based on a weighted combination of the above scores.
4.  **LLM Reranking (Optional)**: If the `--llm-rerank` flag is used:
    *   Take the top N (e.g., 10) results from the initial ranking.
    *   Construct a prompt for the LLM, providing the user's search query and the details of the top N tactics.
    *   The LLM will be asked to rerank these tactics based on semantic relevance, providing a new ordering.
5.  **Final Ranking**: The final list of results will be ordered based on the LLM's reranking. If `--llm-rerank` is not used, the initial ranking will be used.

## 6. LLM Integration

The LLM reranking feature will use the OpenAI API (or compatible endpoints) to provide semantic understanding of the user's search intent.

### 6.1. Configuration

- The LLM API key and endpoint will be configurable via environment variables (`OPENAI_API_KEY`, `OPENAI_BASE_URL`).
- The model to use for reranking will be configurable (default: `gpt-4.1-mini` for cost-effectiveness).
- The number of tactics to send to the LLM for reranking will be configurable (default: 10).

### 6.2. Reranking Prompt Structure

The prompt sent to the LLM will include:

1. **Context**: The current project state, including open goals and their dependencies.
2. **Search Query**: The user's search keywords, goal, or other filters.
3. **Candidate Tactics**: The top N tactics from the initial ranking, with their full details (id, type, description, dependencies, subtasks, tags).
4. **Task**: Ask the LLM to rerank the tactics based on semantic relevance to the user's intent and the project context.

The LLM will return a JSON object with the reranked list of tactic IDs and optional reasoning for each ranking decision.

### 6.3. Implementation Details

- Use the `openai` npm package for API calls.
- Implement a timeout and error handling for API requests.
- If the LLM call fails, fall back to the initial ranking.
- Display a loading indicator while waiting for the LLM response.
- Optionally display the LLM's reasoning in verbose mode (`--verbose` flag).

### 6.4. Cost and Performance Considerations

- LLM reranking is optional and opt-in via the `--llm-rerank` flag.
- Use a smaller, faster model by default to minimize latency and cost.
- Cache LLM responses for identical queries within a session.
- Limit the number of tactics sent to the LLM to control token usage.

## 7. Testing Strategy

- **Unit Tests**: Test individual functions, especially the core DAG manipulation and tactic application logic.
- **Integration Tests**: Write tests for each CLI command, mocking the file system and using a temporary, clean set of database files for each test.
- **End-to-End Tests**: Create shell scripts that run a sequence of `tactician` commands to simulate a user workflow, and assert on the output and the final state of the database files.

## 8. Packaging and Distribution

The CLI will be packaged as a Node.js module and published to the npm registry. The `package.json` file will define the `bin` entry to make the `tactician` command available globally after installation.
