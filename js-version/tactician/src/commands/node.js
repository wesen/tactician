const chalk = require('chalk');
const ProjectDB = require('../db/project');
const { 
  ensureTacticianDir, 
  getProjectDBPath, 
  getStatusSymbol, 
  getStatusText,
  formatTimestamp,
  computeNodeStatus,
  printHeader,
  printSuccess,
  printError,
  printSeparator
} = require('../utils/helpers');

function nodeShowCommand(nodeId) {
  ensureTacticianDir();
  
  const projectDB = new ProjectDB(getProjectDBPath()).open();
  const node = projectDB.getNode(nodeId);
  
  if (!node) {
    projectDB.close();
    printError(`Node not found: ${nodeId}`);
    process.exit(1);
  }
  
  const actualStatus = computeNodeStatus(node, projectDB);
  const deps = projectDB.getDependencies(nodeId);
  const blocks = projectDB.getBlockedBy(nodeId);
  
  printHeader(`Node: ${nodeId}`);
  console.log();
  console.log(chalk.bold('Type:       ') + node.type);
  console.log(chalk.bold('Output:     ') + node.output);
  console.log(chalk.bold('Status:     ') + getStatusSymbol(actualStatus) + ' ' + getStatusText(actualStatus));
  
  if (node.created_by) {
    console.log(chalk.bold('Created by: ') + node.created_by);
  }
  
  if (node.parent_tactic) {
    console.log(chalk.bold('Part of:    ') + node.parent_tactic);
  }
  
  if (node.introduced_as) {
    console.log(chalk.bold('Introduced: ') + node.introduced_as);
  }
  
  console.log();
  
  if (deps.length > 0) {
    console.log(chalk.bold('Dependencies:'));
    deps.forEach(dep => {
      const depStatus = computeNodeStatus(dep, projectDB);
      console.log(`  ${getStatusSymbol(depStatus)} ${dep.id}`);
    });
    console.log();
  }
  
  if (blocks.length > 0) {
    console.log(chalk.bold('Blocks:'));
    const isCriticalPath = blocks.length > 1;
    blocks.forEach(blocked => {
      console.log(`  • ${blocked.id}`);
    });
    if (isCriticalPath) {
      console.log(chalk.yellow('  [CRITICAL PATH]'));
    }
    console.log();
  }
  
  if (node.data) {
    console.log(chalk.bold('Data:'));
    console.log(chalk.gray(JSON.stringify(node.data, null, 2)));
    console.log();
  }
  
  console.log(chalk.bold('Metadata:'));
  console.log(`  Created:  ${formatTimestamp(node.created_at)}`);
  if (node.completed_at) {
    console.log(`  Completed: ${formatTimestamp(node.completed_at)}`);
  }
  
  projectDB.close();
}

function nodeAddCommand(nodeId, output, options) {
  ensureTacticianDir();
  
  const projectDB = new ProjectDB(getProjectDBPath()).open();
  
  // Check if node already exists
  if (projectDB.getNode(nodeId)) {
    projectDB.close();
    printError(`Node already exists: ${nodeId}`);
    process.exit(1);
  }
  
  const node = {
    id: nodeId,
    type: options.type || 'project_artifact',
    output: output,
    status: options.status || 'pending',
    created_at: new Date().toISOString()
  };
  
  projectDB.addNode(node);
  projectDB.logAction('node_created', `Created node: ${nodeId}`, nodeId);
  projectDB.close();
  
  printSuccess(`Created node: ${nodeId}`);
}

function nodeEditCommand(nodeId, options) {
  ensureTacticianDir();
  
  const projectDB = new ProjectDB(getProjectDBPath()).open();
  
  const node = projectDB.getNode(nodeId);
  if (!node) {
    projectDB.close();
    printError(`Node not found: ${nodeId}`);
    process.exit(1);
  }
  
  if (options.status) {
    const completedAt = options.status === 'complete' ? new Date().toISOString() : null;
    projectDB.updateNodeStatus(nodeId, options.status, completedAt);
    
    const action = options.status === 'complete' ? 'node_completed' : 'node_updated';
    projectDB.logAction(action, `Updated ${nodeId} status to ${options.status}`, nodeId);
    
    printSuccess(`Updated: ${nodeId} → ${options.status}`);
    
    // Check if this unblocked any nodes
    const blocks = projectDB.getBlockedBy(nodeId);
    if (options.status === 'complete' && blocks.length > 0) {
      const nowReady = blocks.filter(b => computeNodeStatus(b, projectDB) === 'ready');
      if (nowReady.length > 0) {
        printSuccess(`Unblocked: ${nowReady.map(n => n.id).join(', ')}`);
      }
    }
  }
  
  projectDB.close();
}

function nodeDeleteCommand(nodeId, options) {
  ensureTacticianDir();
  
  const projectDB = new ProjectDB(getProjectDBPath()).open();
  
  const node = projectDB.getNode(nodeId);
  if (!node) {
    projectDB.close();
    printError(`Node not found: ${nodeId}`);
    process.exit(1);
  }
  
  // Check what this node blocks
  const blocks = projectDB.getBlockedBy(nodeId);
  
  if (blocks.length > 0 && !options.force) {
    projectDB.close();
    printError(`Cannot delete ${nodeId}: it blocks ${blocks.length} node(s)`);
    console.log(chalk.gray('Use --force to delete anyway'));
    process.exit(1);
  }
  
  projectDB.deleteNode(nodeId);
  projectDB.logAction('node_deleted', `Deleted node: ${nodeId}`, nodeId);
  projectDB.close();
  
  printSuccess(`Deleted node: ${nodeId}`);
}

module.exports = {
  nodeShowCommand,
  nodeAddCommand,
  nodeEditCommand,
  nodeDeleteCommand
};
