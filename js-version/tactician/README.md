# Tactician CLI

A command-line tool for decomposing complex software projects into manageable task dependency graphs (DAGs).

## Overview

Tactician helps you plan, track, and execute projects by applying reusable "tactics" to achieve your goals. It maintains a directed acyclic graph (DAG) of tasks, tracks dependencies, and suggests the next best steps using intelligent search and ranking.

## Features

- **Task Dependency Graphs**: Organize your project as a DAG of tasks with clear dependencies
- **Reusable Tactics**: 54+ pre-built tactics for common software development workflows
- **Intelligent Search**: Multi-factor ranking algorithm to find the most relevant tactics
- **LLM Reranking**: Optional semantic reranking using OpenAI API
- **Rich Tactics**: Support for complex tactics with multiple subtasks and dependencies
- **Mermaid Visualization**: Export graphs and goals as Mermaid diagrams for beautiful visualization
- **History Tracking**: Complete audit log of all project actions
- **Visual Graph**: Terminal-based visualization of your project structure

## Installation

```bash
# Install dependencies
npm install

# Link the CLI globally
npm link
```

## Quick Start

```bash
# Initialize a new project
tactician init

# Add a root goal
tactician node add my_project complete_system --status pending

# Search for applicable tactics
tactician search --ready

# Apply a tactic
tactician apply gather_requirements

# Mark a task as complete
tactician node edit requirements_document --status complete

# See what's next
tactician goals

# Visualize as Mermaid diagram
tactician graph --mermaid
```

## Mermaid Visualization

Both `graph` and `goals` commands support `--mermaid` flag to output diagrams in Mermaid format:

```bash
# Export full graph as Mermaid
tactician graph --mermaid > graph.mmd

# Export open goals as Mermaid
tactician goals --mermaid > goals.mmd
```

The Mermaid diagrams use color coding:
- 🟢 **Green (Stadium shape)**: Completed nodes
- 🔵 **Blue (Rectangle)**: Ready nodes (can be worked on)
- 🔴 **Red (Rectangle)**: Blocked nodes (waiting on dependencies)

See `visual-walkthrough.md` for a complete example showing graph evolution at each step!

## Documentation

- **[visual-walkthrough.md](./visual-walkthrough.md)**: Visual walkthrough with Mermaid diagrams at each step
- **[USER_GUIDE.md](./USER_GUIDE.md)**: Comprehensive user guide with command reference
- **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)**: Technical implementation details
- **[DEVELOPMENT_DIARY.md](./DEVELOPMENT_DIARY.md)**: Development notes and lessons learned

## Testing

```bash
# Run basic smoke tests
./smoke-tests/test-basic.sh

# Run real-world walkthrough
./smoke-tests/walkthrough-real-project.sh

# Generate visual walkthrough with Mermaid diagrams
./smoke-tests/visual-walkthrough.sh
```

## Project Structure

```
tactician/
├── src/
│   ├── commands/         # CLI command implementations
│   ├── db/              # Database schema and access layer
│   ├── llm/             # LLM reranking module
│   └── utils/           # Helper functions
├── default-tactics/     # Default tactics library (YAML)
├── smoke-tests/         # Test scripts
└── docs/               # Documentation
```

## Database Schema

Tactician uses two SQLite databases:

- **project.db**: Stores nodes, edges, and action log for the current project
- **tactics.db**: Global registry of reusable tactics

## Environment Variables

- `OPENAI_API_KEY`: Required for LLM reranking
- `TACTICIAN_LLM_MODEL`: LLM model to use (default: `gpt-4.1-mini`)
- `TACTICIAN_RERANK_LIMIT`: Max tactics to rerank (default: 10)

## License

MIT

## Author

Built by Manus AI
