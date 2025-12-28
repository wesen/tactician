#!/bin/bash

# Smoke test for basic Tactician CLI functionality
# Tests: init, node add/show/edit, graph, goals, history

set -e  # Exit on error

echo "=================================================="
echo "Tactician CLI - Basic Functionality Smoke Test"
echo "=================================================="
echo ""

# Clean up any existing test directory
TEST_DIR="/tmp/tactician-test-basic"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

echo "✓ Test directory created: $TEST_DIR"
echo ""

# Test 1: Init
echo "Test 1: Initialize project"
echo "----------------------------"
tactician init
echo ""

if [ ! -d ".tactician" ]; then
    echo "✗ FAILED: .tactician directory not created"
    exit 1
fi

if [ ! -f ".tactician/project.db" ]; then
    echo "✗ FAILED: project.db not created"
    exit 1
fi

if [ ! -f ".tactician/tactics.db" ]; then
    echo "✗ FAILED: tactics.db not created"
    exit 1
fi

echo "✓ PASSED: Project initialized successfully"
echo ""

# Test 2: Add root node
echo "Test 2: Add root node"
echo "----------------------------"
tactician node add my_project backend_service --status pending
echo ""

# Verify node was created
tactician node show my_project > /dev/null
if [ $? -ne 0 ]; then
    echo "✗ FAILED: Node not created"
    exit 1
fi

echo "✓ PASSED: Root node created"
echo ""

# Test 3: Add dependent nodes
echo "Test 3: Add dependent nodes"
echo "----------------------------"
tactician node add requirements_doc document --type document --status pending
tactician node add api_spec document --type document --status pending
echo ""

echo "✓ PASSED: Dependent nodes created"
echo ""

# Test 4: Show node details
echo "Test 4: Show node details"
echo "----------------------------"
tactician node show requirements_doc
echo ""

echo "✓ PASSED: Node details displayed"
echo ""

# Test 5: Update node status
echo "Test 5: Update node status to complete"
echo "----------------------------"
tactician node edit requirements_doc --status complete
echo ""

echo "✓ PASSED: Node status updated"
echo ""

# Test 6: View graph
echo "Test 6: View project graph"
echo "----------------------------"
tactician graph
echo ""

echo "✓ PASSED: Graph displayed"
echo ""

# Test 7: View goals
echo "Test 7: View open goals"
echo "----------------------------"
tactician goals
echo ""

echo "✓ PASSED: Goals displayed"
echo ""

# Test 8: View history
echo "Test 8: View action history"
echo "----------------------------"
tactician history
echo ""

echo "✓ PASSED: History displayed"
echo ""

# Test 9: View history summary
echo "Test 9: View session summary"
echo "----------------------------"
tactician history --summary
echo ""

echo "✓ PASSED: Summary displayed"
echo ""

# Test 10: Delete node
echo "Test 10: Delete node"
echo "----------------------------"
tactician node delete api_spec
echo ""

# Verify node was deleted
tactician node show api_spec > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✗ FAILED: Node was not deleted"
    exit 1
fi

echo "✓ PASSED: Node deleted"
echo ""

# Test 11: Check database integrity
echo "Test 11: Database integrity check"
echo "----------------------------"
sqlite3 .tactician/project.db "PRAGMA integrity_check;" | grep -q "ok"
if [ $? -ne 0 ]; then
    echo "✗ FAILED: Database integrity check failed"
    exit 1
fi

sqlite3 .tactician/tactics.db "PRAGMA integrity_check;" | grep -q "ok"
if [ $? -ne 0 ]; then
    echo "✗ FAILED: Tactics database integrity check failed"
    exit 1
fi

echo "✓ PASSED: Database integrity verified"
echo ""

# Test 12: Check tactics were loaded
echo "Test 12: Verify tactics loaded"
echo "----------------------------"
TACTIC_COUNT=$(sqlite3 .tactician/tactics.db "SELECT COUNT(*) FROM tactics;")
echo "Loaded tactics: $TACTIC_COUNT"

if [ "$TACTIC_COUNT" -lt 50 ]; then
    echo "✗ FAILED: Expected at least 50 tactics, got $TACTIC_COUNT"
    exit 1
fi

echo "✓ PASSED: Tactics loaded successfully"
echo ""

# All tests passed
echo "=================================================="
echo "✓ ALL TESTS PASSED"
echo "=================================================="
echo ""
echo "Cleanup: Test directory at $TEST_DIR"
echo "Run 'rm -rf $TEST_DIR' to clean up"
