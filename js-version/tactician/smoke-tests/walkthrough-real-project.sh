#!/bin/bash

# Real-world project walkthrough: Building a Task Management SaaS
# This script demonstrates the full Tactician workflow

set -e

echo "=================================================="
echo "Tactician - Real Project Walkthrough"
echo "Project: Task Management SaaS"
echo "=================================================="
echo ""

# Clean up
TEST_DIR="/tmp/tactician-walkthrough"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

echo "Step 1: Initialize project"
echo "----------------------------"
tactician init
echo ""

echo "Step 2: Add root goal"
echo "----------------------------"
echo "We want to build a task management SaaS with web and mobile apps"
tactician node add task_management_saas complete_system --type product --status pending
echo ""

echo "Step 3: Search for initial tactics"
echo "----------------------------"
echo "Let's see what we should do first..."
tactician search --ready --limit 5
echo ""

echo "Step 4: Gather requirements"
echo "----------------------------"
echo "y" | tactician apply gather_requirements
tactician node edit requirements_document --status complete
echo ""

echo "Step 5: Check what's unblocked"
echo "----------------------------"
tactician goals
echo ""

echo "Step 6: Search for design tactics"
echo "----------------------------"
tactician search "design" --ready --limit 5
echo ""

echo "Step 7: Design data model"
echo "----------------------------"
echo "y" | tactician apply design_data_model
tactician node edit data_model --status complete
echo ""

echo "Step 8: Design API"
echo "----------------------------"
# First need technical spec
echo "y" | tactician apply write_technical_spec
tactician node edit technical_specification --status complete
echo "y" | tactician apply design_api
tactician node edit api_specification --status complete
echo ""

echo "Step 9: Check project graph"
echo "----------------------------"
tactician graph
echo ""

echo "Step 10: Search for implementation tactics"
echo "----------------------------"
tactician search "implement" --ready --limit 10
echo ""

echo "Step 11: Apply rich tactic (CRUD endpoints)"
echo "----------------------------"
echo "This will create multiple subtasks with dependencies"
echo "y" | tactician apply implement_crud_endpoints
echo ""

echo "Step 12: View the expanded graph"
echo "----------------------------"
tactician graph
echo ""

echo "Step 13: Check goals - see the workflow"
echo "----------------------------"
tactician goals
echo ""

echo "Step 14: Complete first subtask"
echo "----------------------------"
tactician node edit endpoints_analysis --status complete
echo ""

echo "Step 15: See what's unblocked"
echo "----------------------------"
tactician goals
echo ""

echo "Step 16: Complete api_code"
echo "----------------------------"
tactician node edit api_code --status complete
echo ""

echo "Step 17: See final goal"
echo "----------------------------"
tactician goals
echo ""

echo "Step 18: View session history"
echo "----------------------------"
tactician history --summary
echo ""

echo "Step 19: Search with LLM reranking"
echo "----------------------------"
if [ -n "$OPENAI_API_KEY" ]; then
  echo "Testing LLM reranking..."
  tactician search "database" --llm-rerank --limit 5
else
  echo "Skipping LLM reranking (no API key)"
fi
echo ""

echo "=================================================="
echo "Walkthrough Complete!"
echo "=================================================="
echo ""
echo "Project state:"
sqlite3 .tactician/project.db "SELECT status, COUNT(*) FROM nodes GROUP BY status;"
echo ""
echo "Total actions:"
sqlite3 .tactician/project.db "SELECT COUNT(*) FROM action_log;"
echo ""
echo "Project directory: $TEST_DIR"
