#!/bin/bash

# Comprehensive test suite for Tactician CLI
# Tests all major functionality

set -e

echo "=================================================="
echo "Tactician CLI - Comprehensive Test Suite"
echo "=================================================="
echo ""

FAILED_TESTS=0
PASSED_TESTS=0

# Test directory
TEST_DIR="/tmp/tactician-test-all"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"

# Helper functions
pass_test() {
  echo "✓ PASSED: $1"
  PASSED_TESTS=$((PASSED_TESTS + 1))
}

fail_test() {
  echo "✗ FAILED: $1"
  FAILED_TESTS=$((FAILED_TESTS + 1))
}

# Test 1: Init
echo "Test 1: Project initialization"
echo "----------------------------"
cd "$TEST_DIR" && tactician init > /dev/null 2>&1
if [ -f ".tactician/project.db" ] && [ -f ".tactician/tactics.db" ]; then
  pass_test "Project initialized"
else
  fail_test "Project initialization"
fi
echo ""

# Test 2: Tactics loaded
echo "Test 2: Tactics loaded"
echo "----------------------------"
TACTIC_COUNT=$(sqlite3 .tactician/tactics.db "SELECT COUNT(*) FROM tactics;")
if [ "$TACTIC_COUNT" -ge 50 ]; then
  pass_test "Loaded $TACTIC_COUNT tactics"
else
  fail_test "Only loaded $TACTIC_COUNT tactics (expected >= 50)"
fi
echo ""

# Test 3: Node creation
echo "Test 3: Node operations"
echo "----------------------------"
tactician node add test_node test_output --type document --status pending > /dev/null 2>&1
NODE_COUNT=$(sqlite3 .tactician/project.db "SELECT COUNT(*) FROM nodes WHERE id='test_node';")
if [ "$NODE_COUNT" -eq 1 ]; then
  pass_test "Node created"
else
  fail_test "Node creation"
fi
echo ""

# Test 4: Node update
tactician node edit test_node --status complete > /dev/null 2>&1
NODE_STATUS=$(sqlite3 .tactician/project.db "SELECT status FROM nodes WHERE id='test_node';")
if [ "$NODE_STATUS" = "complete" ]; then
  pass_test "Node updated"
else
  fail_test "Node update"
fi
echo ""

# Test 5: Node deletion
tactician node delete test_node > /dev/null 2>&1
NODE_COUNT=$(sqlite3 .tactician/project.db "SELECT COUNT(*) FROM nodes WHERE id='test_node';")
if [ "$NODE_COUNT" -eq 0 ]; then
  pass_test "Node deleted"
else
  fail_test "Node deletion"
fi
echo ""

# Test 6: Search without query
echo "Test 6: Search functionality"
echo "----------------------------"
SEARCH_RESULTS=$(tactician search --ready --limit 5 2>/dev/null | grep -c "Type:")
if [ "$SEARCH_RESULTS" -ge 5 ]; then
  pass_test "Search returns results"
else
  fail_test "Search functionality"
fi
echo ""

# Test 7: Search with query
SEARCH_RESULTS=$(tactician search "api" --limit 5 2>/dev/null | grep -c "api")
if [ "$SEARCH_RESULTS" -ge 1 ]; then
  pass_test "Search with query"
else
  fail_test "Search with query"
fi
echo ""

# Test 8: Apply simple tactic
echo "Test 8: Apply tactic"
echo "----------------------------"
echo "y" | tactician apply gather_requirements > /dev/null 2>&1
NODE_COUNT=$(sqlite3 .tactician/project.db "SELECT COUNT(*) FROM nodes WHERE id='requirements_document';")
if [ "$NODE_COUNT" -eq 1 ]; then
  pass_test "Tactic applied"
else
  fail_test "Tactic application"
fi
echo ""

# Test 9: Apply rich tactic with subtasks
echo "Test 9: Apply rich tactic"
echo "----------------------------"
tactician node add api_specification api_specification --type document --status complete > /dev/null 2>&1
tactician node add data_model data_model --type document --status complete > /dev/null 2>&1
echo "y" | tactician apply implement_crud_endpoints > /dev/null 2>&1
SUBTASK_COUNT=$(sqlite3 .tactician/project.db "SELECT COUNT(*) FROM nodes WHERE parent_tactic='implement_crud_endpoints';")
if [ "$SUBTASK_COUNT" -eq 3 ]; then
  pass_test "Rich tactic with subtasks"
else
  fail_test "Rich tactic application (expected 3 subtasks, got $SUBTASK_COUNT)"
fi
echo ""

# Test 10: Dependency edges
echo "Test 10: Dependency tracking"
echo "----------------------------"
EDGE_COUNT=$(sqlite3 .tactician/project.db "SELECT COUNT(*) FROM edges;")
if [ "$EDGE_COUNT" -ge 1 ]; then
  pass_test "Dependencies tracked"
else
  fail_test "Dependency tracking"
fi
echo ""

# Test 11: Goals command
echo "Test 11: Goals listing"
echo "----------------------------"
GOALS_OUTPUT=$(tactician goals 2>/dev/null)
if echo "$GOALS_OUTPUT" | grep -q "Open Goals"; then
  pass_test "Goals command works"
else
  fail_test "Goals command"
fi
echo ""

# Test 12: Graph command
echo "Test 12: Graph visualization"
echo "----------------------------"
GRAPH_OUTPUT=$(tactician graph 2>/dev/null)
if echo "$GRAPH_OUTPUT" | grep -q "Project:"; then
  pass_test "Graph command works"
else
  fail_test "Graph command"
fi
echo ""

# Test 13: History command
echo "Test 13: History tracking"
echo "----------------------------"
HISTORY_COUNT=$(sqlite3 .tactician/project.db "SELECT COUNT(*) FROM action_log;")
if [ "$HISTORY_COUNT" -ge 5 ]; then
  pass_test "History tracked ($HISTORY_COUNT actions)"
else
  fail_test "History tracking"
fi
echo ""

# Test 14: History summary
SUMMARY_OUTPUT=$(tactician history --summary 2>/dev/null)
if echo "$SUMMARY_OUTPUT" | grep -q "Total Actions:"; then
  pass_test "History summary works"
else
  fail_test "History summary"
fi
echo ""

# Test 15: Status propagation
echo "Test 15: Status propagation"
echo "----------------------------"
tactician node edit endpoints_analysis --status complete > /dev/null 2>&1
# Check if api_code is now ready (not blocked)
GOALS_OUTPUT=$(tactician goals 2>/dev/null)
if echo "$GOALS_OUTPUT" | grep -q "api_code"; then
  pass_test "Status propagation works"
else
  fail_test "Status propagation"
fi
echo ""

# Test 16: Database integrity
echo "Test 16: Database integrity"
echo "----------------------------"
PROJECT_INTEGRITY=$(sqlite3 .tactician/project.db "PRAGMA integrity_check;" | grep -c "ok")
TACTICS_INTEGRITY=$(sqlite3 .tactician/tactics.db "PRAGMA integrity_check;" | grep -c "ok")
if [ "$PROJECT_INTEGRITY" -eq 1 ] && [ "$TACTICS_INTEGRITY" -eq 1 ]; then
  pass_test "Database integrity verified"
else
  fail_test "Database integrity"
fi
echo ""

# Test 17: LLM reranking (if API key available)
echo "Test 17: LLM reranking"
echo "----------------------------"
if [ -n "$OPENAI_API_KEY" ]; then
  RERANK_OUTPUT=$(tactician search "database" --llm-rerank --limit 3 2>&1)
  if echo "$RERANK_OUTPUT" | grep -q "Reranking complete"; then
    pass_test "LLM reranking works"
  else
    fail_test "LLM reranking"
  fi
else
  echo "⊘ SKIPPED: No OPENAI_API_KEY"
fi
echo ""

# Summary
echo "=================================================="
echo "Test Summary"
echo "=================================================="
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"
echo ""

if [ "$FAILED_TESTS" -eq 0 ]; then
  echo "✓ ALL TESTS PASSED"
  exit 0
else
  echo "✗ SOME TESTS FAILED"
  exit 1
fi
