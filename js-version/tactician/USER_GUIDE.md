# Tactician CLI - User Guide

**Author:** Manus AI
**Date:** 2025-12-28

## 1. Introduction

Tactician is a command-line tool for decomposing complex software projects into manageable task dependency graphs (DAGs). It helps you plan, track, and execute projects by applying reusable "tactics" to achieve your goals.

This guide provides a comprehensive overview of Tactician, its core concepts, and how to use its commands to manage your projects effectively.

## 2. Core Concepts

### 2.1. Nodes

A **node** is the fundamental unit of work in Tactician. It represents a task, a deliverable, or a goal. Each node has:

- **ID:** A unique identifier (e.g., `api_specification`).
- **Output:** The artifact produced by the node (e.g., `api_specification`).
- **Type:** The category of work (e.g., `document`, `code`).
- **Status:** The current state of the node:
    - `pending`: Not yet started.
    - `ready`: All dependencies are met, ready to be worked on.
    - `complete`: The task is finished.
    - `blocked`: One or more dependencies are not met.

### 2.2. Tactics

A **tactic** is a reusable recipe for creating nodes. It defines a common workflow or pattern. For example, the `design_api` tactic might create an `api_specification` node that depends on a `technical_specification` node.

Tactics can be simple (creating a single node) or rich (creating a complex graph of subtasks with their own dependencies).

### 2.3. Dependency Graph (DAG)

Tactician organizes nodes into a **Directed Acyclic Graph (DAG)**. This means that tasks can have dependencies, but there are no circular relationships. This ensures that your project always has a clear path forward.

## 3. Installation

To install Tactician, you need Node.js and npm installed. Then, you can link the CLI to your path:

```bash
# Navigate to the project directory
cd /path/to/tactician

# Link the CLI
npm link
```

This will make the `tactician` command available globally in your terminal.

## 4. Command Reference

### 4.1. `init`

Initializes a new Tactician project in the current directory. This creates a `.tactician` directory containing the project and tactics databases.

```bash
tactician init
```

### 4.2. `node`

Manages nodes in the project graph.

- **`node add <id> <output> [options]`**: Add a new node.
- **`node show <id>`**: Show details for a specific node.
- **`node edit <id> [options]`**: Update a node (e.g., change its status).
- **`node delete <id>`**: Remove a node from the graph.

### 4.3. `search [query]`

Searches the tactics library for applicable tactics. This is the core of Tactician's planning capabilities.

```bash
# Search for tactics related to "api"
tactician search "api"

# Show only tactics that are ready to be applied
tactician search --ready

# Use LLM to semantically rerank results
tactician search "implement user login" --llm-rerank
```

**Ranking Algorithm:**

Tactician uses a multi-factor scoring algorithm to rank search results:

1.  **Dependency Status:** Ready tactics are ranked highest.
2.  **Critical Path Impact:** Tactics that unblock more work are prioritized.
3.  **Keyword Relevance:** Matches against tactic ID, tags, and description.
4.  **Goal Alignment:** How well the tactic aligns with your specified goals.

**LLM Reranking:**

Using the `--llm-rerank` flag, you can leverage a Large Language Model (LLM) to provide more intelligent, semantic reranking of search results. This is especially useful for complex or ambiguous queries.

### 4.4. `apply <tactic-id>`

Applies a tactic to the project, creating new nodes and dependencies as defined by the tactic.

```bash
# Apply the design_data_model tactic
tactician apply design_data_model
```

### 4.5. `goals`

Lists all open (incomplete) goals, sorted by their status. This command gives you a clear overview of what you can work on next.

```bash
tactician goals
```

### 4.6. `graph`

Displays a visual representation of the project's dependency graph in your terminal.

```bash
tactician graph
```

### 4.7. `history`

Shows a log of all actions taken in the project. You can also view a summary of the session.

```bash
# Show detailed history
tactician history

# Show session summary
tactician history --summary
```

## 5. Walkthrough: Building a SaaS App

Here’s a quick walkthrough of how you might use Tactician to plan a new SaaS application.

1.  **Initialize the project:**

    ```bash
    mkdir my-saas-project && cd my-saas-project
    tactician init
    ```

2.  **Define the root goal:**

    ```bash
    tactician node add my_saas_app complete_product --status pending
    ```

3.  **Find what to do first:**

    ```bash
    tactician search --ready
    # The top result will likely be `gather_requirements`
    ```

4.  **Apply the tactic and complete the task:**

    ```bash
    tactician apply gather_requirements --yes
    tactician node edit requirements_document --status complete
    ```

5.  **See what's next:**

    ```bash
    tactician goals
    # You'll see new goals like `design_data_model` and `write_technical_spec`
    ```

6.  **Continue applying tactics and completing nodes** to build out your project plan step by step.

## 6. Conclusion

Tactician provides a powerful and flexible way to manage complex projects. By combining a rich library of tactics with intelligent search and a clear dependency graph, it helps you stay organized and focused on what matters most.

For more details, you can explore the source code and the default tactics library to see how everything works.
