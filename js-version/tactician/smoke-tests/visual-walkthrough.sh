#!/bin/bash

# Visual walkthrough: Generate Markdown with Mermaid diagrams at each step
# This demonstrates how the graph evolves as you build your project

set -e

OUTPUT_FILE="visual-walkthrough.md"
TEST_DIR="/tmp/tactician-visual"

echo "Generating visual walkthrough..."

# Clean up
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Initialize output file
cat > "$OUTPUT_FILE" << 'EOF'
# Tactician CLI - Visual Walkthrough

This document shows how the project graph evolves as you apply tactics and complete tasks.

**Legend:**
- 🟢 Green (Stadium shape): Complete nodes
- 🔵 Blue (Rectangle): Ready nodes (can be worked on)
- 🔴 Red (Rectangle): Blocked nodes (waiting on dependencies)

---

EOF

# Step 1: Initialize
echo "Step 1: Initialize project"
tactician init > /dev/null 2>&1

cat >> "$OUTPUT_FILE" << 'EOF'
## Step 1: Initialize Project

```bash
tactician init
```

Project initialized with empty graph.

```mermaid
EOF
tactician graph --mermaid >> "$OUTPUT_FILE"
cat >> "$OUTPUT_FILE" << 'EOF'
```

---

EOF

# Step 2: Add root goal
echo "Step 2: Add root goal"
tactician node add my_saas_app complete_product --type product --status pending > /dev/null 2>&1

cat >> "$OUTPUT_FILE" << 'EOF'
## Step 2: Add Root Goal

```bash
tactician node add my_saas_app complete_product --type product --status pending
```

We've added the root goal for our SaaS application.

### Full Graph

```mermaid
EOF
tactician graph --mermaid >> "$OUTPUT_FILE"
cat >> "$OUTPUT_FILE" << 'EOF'
```

### Open Goals

```mermaid
EOF
tactician goals --mermaid >> "$OUTPUT_FILE"
cat >> "$OUTPUT_FILE" << 'EOF'
```

---

EOF

# Step 3: Apply gather_requirements
echo "Step 3: Apply gather_requirements tactic"
echo "y" | tactician apply gather_requirements > /dev/null 2>&1

cat >> "$OUTPUT_FILE" << 'EOF'
## Step 3: Apply `gather_requirements` Tactic

```bash
tactician apply gather_requirements
```

This tactic creates a `requirements_document` node.

### Full Graph

```mermaid
EOF
tactician graph --mermaid >> "$OUTPUT_FILE"
cat >> "$OUTPUT_FILE" << 'EOF'
```

### Open Goals

```mermaid
EOF
tactician goals --mermaid >> "$OUTPUT_FILE"
cat >> "$OUTPUT_FILE" << 'EOF'
```

---

EOF

# Step 4: Complete requirements_document
echo "Step 4: Complete requirements_document"
tactician node edit requirements_document --status complete > /dev/null 2>&1

cat >> "$OUTPUT_FILE" << 'EOF'
## Step 4: Complete Requirements Document

```bash
tactician node edit requirements_document --status complete
```

Marking the requirements document as complete unblocks dependent tasks.

### Full Graph

```mermaid
EOF
tactician graph --mermaid >> "$OUTPUT_FILE"
cat >> "$OUTPUT_FILE" << 'EOF'
```

### Open Goals

```mermaid
EOF
tactician goals --mermaid >> "$OUTPUT_FILE"
cat >> "$OUTPUT_FILE" << 'EOF'
```

Notice how nodes that depend on `requirements_document` are now ready (blue).

---

EOF

# Step 5: Apply design_data_model
echo "Step 5: Apply design_data_model tactic"
echo "y" | tactician apply design_data_model > /dev/null 2>&1

cat >> "$OUTPUT_FILE" << 'EOF'
## Step 5: Apply `design_data_model` Tactic

```bash
tactician apply design_data_model
```

This creates a `data_model` node that depends on `requirements_document`.

### Full Graph

```mermaid
EOF
tactician graph --mermaid >> "$OUTPUT_FILE"
cat >> "$OUTPUT_FILE" << 'EOF'
```

### Open Goals

```mermaid
EOF
tactician goals --mermaid >> "$OUTPUT_FILE"
cat >> "$OUTPUT_FILE" << 'EOF'
```

---

EOF

# Step 6: Complete data_model
echo "Step 6: Complete data_model"
tactician node edit data_model --status complete > /dev/null 2>&1

cat >> "$OUTPUT_FILE" << 'EOF'
## Step 6: Complete Data Model

```bash
tactician node edit data_model --status complete
```

### Full Graph

```mermaid
EOF
tactician graph --mermaid >> "$OUTPUT_FILE"
cat >> "$OUTPUT_FILE" << 'EOF'
```

### Open Goals

```mermaid
EOF
tactician goals --mermaid >> "$OUTPUT_FILE"
cat >> "$OUTPUT_FILE" << 'EOF'
```

---

EOF

# Step 7: Apply write_technical_spec and complete it
echo "Step 7: Apply write_technical_spec and complete it"
echo "y" | tactician apply write_technical_spec > /dev/null 2>&1
tactician node edit technical_specification --status complete > /dev/null 2>&1

cat >> "$OUTPUT_FILE" << 'EOF'
## Step 7: Create and Complete Technical Specification

```bash
tactician apply write_technical_spec
tactician node edit technical_specification --status complete
```

### Full Graph

```mermaid
EOF
tactician graph --mermaid >> "$OUTPUT_FILE"
cat >> "$OUTPUT_FILE" << 'EOF'
```

### Open Goals

```mermaid
EOF
tactician goals --mermaid >> "$OUTPUT_FILE"
cat >> "$OUTPUT_FILE" << 'EOF'
```

---

EOF

# Step 8: Apply design_api
echo "Step 8: Apply design_api tactic"
echo "y" | tactician apply design_api > /dev/null 2>&1

cat >> "$OUTPUT_FILE" << 'EOF'
## Step 8: Apply `design_api` Tactic

```bash
tactician apply design_api
```

This creates an `api_specification` node.

### Full Graph

```mermaid
EOF
tactician graph --mermaid >> "$OUTPUT_FILE"
cat >> "$OUTPUT_FILE" << 'EOF'
```

### Open Goals

```mermaid
EOF
tactician goals --mermaid >> "$OUTPUT_FILE"
cat >> "$OUTPUT_FILE" << 'EOF'
```

---

EOF

# Step 9: Complete api_specification
echo "Step 9: Complete api_specification"
tactician node edit api_specification --status complete > /dev/null 2>&1

cat >> "$OUTPUT_FILE" << 'EOF'
## Step 9: Complete API Specification

```bash
tactician node edit api_specification --status complete
```

### Full Graph

```mermaid
EOF
tactician graph --mermaid >> "$OUTPUT_FILE"
cat >> "$OUTPUT_FILE" << 'EOF'
```

### Open Goals

```mermaid
EOF
tactician goals --mermaid >> "$OUTPUT_FILE"
cat >> "$OUTPUT_FILE" << 'EOF'
```

---

EOF

# Step 10: Apply rich tactic (implement_crud_endpoints)
echo "Step 10: Apply implement_crud_endpoints (rich tactic)"
echo "y" | tactician apply implement_crud_endpoints > /dev/null 2>&1

cat >> "$OUTPUT_FILE" << 'EOF'
## Step 10: Apply `implement_crud_endpoints` (Rich Tactic)

```bash
tactician apply implement_crud_endpoints
```

This is a **rich tactic** that creates 3 subtasks with dependencies:
1. `endpoints_analysis` (ready immediately)
2. `api_code` (blocked by endpoints_analysis)
3. `endpoint_tests` (blocked by api_code)

### Full Graph

```mermaid
EOF
tactician graph --mermaid >> "$OUTPUT_FILE"
cat >> "$OUTPUT_FILE" << 'EOF'
```

### Open Goals

```mermaid
EOF
tactician goals --mermaid >> "$OUTPUT_FILE"
cat >> "$OUTPUT_FILE" << 'EOF'
```

Notice the dependency chain: `endpoints_analysis` → `api_code` → `endpoint_tests`

---

EOF

# Step 11: Complete endpoints_analysis
echo "Step 11: Complete endpoints_analysis"
tactician node edit endpoints_analysis --status complete > /dev/null 2>&1

cat >> "$OUTPUT_FILE" << 'EOF'
## Step 11: Complete Endpoints Analysis

```bash
tactician node edit endpoints_analysis --status complete
```

Completing this unblocks `api_code`.

### Full Graph

```mermaid
EOF
tactician graph --mermaid >> "$OUTPUT_FILE"
cat >> "$OUTPUT_FILE" << 'EOF'
```

### Open Goals

```mermaid
EOF
tactician goals --mermaid >> "$OUTPUT_FILE"
cat >> "$OUTPUT_FILE" << 'EOF'
```

---

EOF

# Step 12: Complete api_code
echo "Step 12: Complete api_code"
tactician node edit api_code --status complete > /dev/null 2>&1

cat >> "$OUTPUT_FILE" << 'EOF'
## Step 12: Complete API Code

```bash
tactician node edit api_code --status complete
```

Completing this unblocks `endpoint_tests`.

### Full Graph

```mermaid
EOF
tactician graph --mermaid >> "$OUTPUT_FILE"
cat >> "$OUTPUT_FILE" << 'EOF'
```

### Open Goals

```mermaid
EOF
tactician goals --mermaid >> "$OUTPUT_FILE"
cat >> "$OUTPUT_FILE" << 'EOF'
```

---

EOF

# Step 13: Complete endpoint_tests
echo "Step 13: Complete endpoint_tests"
tactician node edit endpoint_tests --status complete > /dev/null 2>&1

cat >> "$OUTPUT_FILE" << 'EOF'
## Step 13: Complete Endpoint Tests

```bash
tactician node edit endpoint_tests --status complete
```

All subtasks of the `implement_crud_endpoints` tactic are now complete!

### Full Graph

```mermaid
EOF
tactician graph --mermaid >> "$OUTPUT_FILE"
cat >> "$OUTPUT_FILE" << 'EOF'
```

### Open Goals

```mermaid
EOF
tactician goals --mermaid >> "$OUTPUT_FILE"
cat >> "$OUTPUT_FILE" << 'EOF'
```

---

## Summary

This walkthrough demonstrated:

1. **Initialization**: Starting with an empty project
2. **Adding Goals**: Creating the root goal
3. **Applying Tactics**: Using tactics to create nodes
4. **Completing Tasks**: Marking nodes as complete
5. **Dependency Propagation**: How completing nodes unblocks dependents
6. **Rich Tactics**: Complex tactics with multiple subtasks and dependencies

The graph visualization clearly shows:
- **Green nodes (stadium shape)**: Completed tasks
- **Blue nodes (rectangles)**: Ready to work on
- **Red nodes (rectangles)**: Blocked by dependencies

The Mermaid diagrams update at each step, showing the evolution of your project graph.

EOF

echo "Visual walkthrough generated: $TEST_DIR/$OUTPUT_FILE"
echo ""
echo "To view the rendered Markdown:"
echo "  cat $TEST_DIR/$OUTPUT_FILE"
echo ""
echo "Or copy it to a Markdown viewer that supports Mermaid diagrams."
