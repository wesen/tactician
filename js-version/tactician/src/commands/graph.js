const chalk = require('chalk');
const ProjectDB = require('../db/project');
const { 
  ensureTacticianDir, 
  getProjectDBPath, 
  getStatusSymbol,
  computeNodeStatus,
  printError
} = require('../utils/helpers');

function buildTree(nodes, edges, rootId, visited = new Set()) {
  if (visited.has(rootId)) {
    return null; // Avoid cycles
  }
  visited.add(rootId);
  
  const root = nodes.find(n => n.id === rootId);
  if (!root) return null;
  
  const children = edges
    .filter(e => e.source_node_id === rootId)
    .map(e => buildTree(nodes, edges, e.target_node_id, visited))
    .filter(Boolean);
  
  return { node: root, children };
}

function printTree(tree, projectDB, prefix = '', isLast = true, goalId = null) {
  if (!tree) return;
  
  const { node, children } = tree;
  const actualStatus = computeNodeStatus(node, projectDB);
  const statusSymbol = getStatusSymbol(actualStatus);
  
  // Determine if this is a goal (has children or is explicitly marked)
  const isGoal = children.length > 0 || node.type === 'project_artifact';
  const nodeSymbol = isGoal ? '🎯' : statusSymbol;
  
  // Build the node display
  let nodeDisplay = `${nodeSymbol} ${chalk.bold(node.id)}`;
  
  if (node.type !== 'project_artifact') {
    nodeDisplay += chalk.gray(` [${node.type}]`);
  }
  
  // Add status info if not complete
  if (actualStatus !== 'complete') {
    if (actualStatus === 'ready') {
      nodeDisplay += chalk.cyan(' (READY)');
    } else if (actualStatus === 'blocked') {
      const deps = projectDB.getDependencies(node.id);
      const blockedBy = deps.filter(d => d.status !== 'complete').map(d => d.id);
      if (blockedBy.length > 0) {
        nodeDisplay += chalk.red(` (BLOCKED: ${blockedBy.join(', ')})`);
      }
    }
  }
  
  // Check if this blocks multiple nodes (critical path)
  const blocks = projectDB.getBlockedBy(node.id);
  if (blocks.length > 1 && actualStatus !== 'complete') {
    nodeDisplay += chalk.yellow(' [CRITICAL PATH]');
  }
  
  // Add parent tactic info
  if (node.parent_tactic) {
    nodeDisplay += chalk.gray(` (part of ${node.parent_tactic})`);
  }
  
  console.log(prefix + nodeDisplay);
  
  // Print children
  if (children.length > 0) {
    children.forEach((child, index) => {
      const isLastChild = index === children.length - 1;
      const childPrefix = prefix + (isLast ? '  ' : '│ ');
      const connector = isLastChild ? '└─ ' : '├─ ';
      
      printTree(child, projectDB, childPrefix + connector, isLastChild, goalId);
    });
  }
}

function graphCommand(goalId, options = {}) {
  ensureTacticianDir();
  
  // If mermaid output requested, generate and return
  if (options.mermaid) {
    return generateMermaidGraph(options);
  }
  
  const projectDB = new ProjectDB(getProjectDBPath()).open();
  const meta = projectDB.getProjectMeta();
  const allNodes = projectDB.getAllNodes();
  const edges = projectDB.getEdges();
  
  if (allNodes.length === 0) {
    projectDB.close();
    console.log(chalk.gray('No nodes in project yet.'));
    console.log(chalk.gray('Add a root goal: tactician node add <id> <output>'));
    return;
  }
  
  // If goalId specified, start from that node
  let rootId = goalId;
  
  // Otherwise, use root_goal from meta or find nodes with no dependencies
  if (!rootId) {
    rootId = meta.root_goal;
    
    if (!rootId) {
      // Find nodes with no incoming edges (roots)
      const nodesWithDeps = new Set(edges.map(e => e.target_node_id));
      const roots = allNodes.filter(n => !nodesWithDeps.has(n.id));
      
      if (roots.length === 0) {
        projectDB.close();
        printError('No root node found. Set root_goal in project meta or specify a goal-id.');
        process.exit(1);
      }
      
      // Use first root
      rootId = roots[0].id;
    }
  }
  
  // Verify the node exists
  if (!projectDB.getNode(rootId)) {
    projectDB.close();
    printError(`Node not found: ${rootId}`);
    process.exit(1);
  }
  
  console.log();
  console.log(chalk.bold.cyan(`Project: ${meta.name || 'untitled'}`));
  console.log();
  
  // Build and print tree
  const tree = buildTree(allNodes, edges, rootId);
  if (tree) {
    printTree(tree, projectDB, '', true, goalId);
  }
  
  console.log();
  console.log(chalk.gray('Legend: ✓=complete ⏳=pending 🎯=goal'));
  console.log();
  
  projectDB.close();
}

/**
 * Generate Mermaid diagram for the project graph
 */
function generateMermaidGraph(options = {}) {
  const projectDB = new ProjectDB(getProjectDBPath()).open();
  const allNodes = projectDB.getAllNodes();
  const allEdges = projectDB.getEdges();
  
  if (allNodes.length === 0) {
    projectDB.close();
    console.log('graph TD');
    console.log('  empty["No nodes yet"]');
    return;
  }
  
  // Start mermaid graph
  let mermaid = 'graph TD\n';
  
  // Add nodes
  allNodes.forEach(node => {
    const status = computeNodeStatus(node, projectDB);
    const nodeId = node.id.replace(/[^a-zA-Z0-9_]/g, '_');
    
    // Choose shape and style based on status
    let shape = '[';
    let endShape = ']';
    let styleClass = '';
    
    if (status === 'complete') {
      shape = '(['; endShape = '])';
      styleClass = 'complete';
    } else if (status === 'ready') {
      shape = '['; endShape = ']';
      styleClass = 'ready';
    } else if (status === 'blocked') {
      shape = '['; endShape = ']';
      styleClass = 'blocked';
    }
    
    const label = `${node.id}<br/>${node.output}`;
    mermaid += `  ${nodeId}${shape}"${label}"${endShape}\n`;
    
    if (styleClass) {
      mermaid += `  class ${nodeId} ${styleClass}\n`;
    }
  });
  
  // Add edges
  allEdges.forEach(edge => {
    const fromId = edge.source_node_id.replace(/[^a-zA-Z0-9_]/g, '_');
    const toId = edge.target_node_id.replace(/[^a-zA-Z0-9_]/g, '_');
    mermaid += `  ${fromId} --> ${toId}\n`;
  });
  
  // Add style definitions
  mermaid += '\n';
  mermaid += '  classDef complete fill:#90EE90,stroke:#2E7D32,stroke-width:2px\n';
  mermaid += '  classDef ready fill:#87CEEB,stroke:#1976D2,stroke-width:2px\n';
  mermaid += '  classDef blocked fill:#FFB6C1,stroke:#C62828,stroke-width:2px\n';
  
  projectDB.close();
  console.log(mermaid);
}

module.exports = graphCommand;
