const chalk = require('chalk');
const ProjectDB = require('../db/project');
const { 
  ensureTacticianDir, 
  getProjectDBPath, 
  getStatusSymbol,
  getStatusText,
  computeNodeStatus,
  getPendingNodes,
  printHeader
} = require('../utils/helpers');

function goalsCommand(options = {}) {
  ensureTacticianDir();
  
  // If mermaid output requested, generate and return
  if (options.mermaid) {
    return generateMermaidGoals(options);
  }
  
  const projectDB = new ProjectDB(getProjectDBPath()).open();
  const pendingNodes = getPendingNodes(projectDB);
  
  if (pendingNodes.length === 0) {
    projectDB.close();
    console.log(chalk.green('✓ All goals complete!'));
    return;
  }
  
  // Compute actual status for each node
  const nodesWithStatus = pendingNodes.map(node => ({
    ...node,
    actualStatus: computeNodeStatus(node, projectDB),
    deps: projectDB.getDependencies(node.id),
    blocks: projectDB.getBlockedBy(node.id)
  }));
  
  // Sort: ready first, then blocked
  nodesWithStatus.sort((a, b) => {
    if (a.actualStatus === 'ready' && b.actualStatus !== 'ready') return -1;
    if (a.actualStatus !== 'ready' && b.actualStatus === 'ready') return 1;
    return 0;
  });
  
  const readyCount = nodesWithStatus.filter(n => n.actualStatus === 'ready').length;
  const blockedCount = nodesWithStatus.filter(n => n.actualStatus === 'blocked').length;
  
  printHeader(`Open Goals (${pendingNodes.length})`);
  console.log();
  
  if (readyCount > 0) {
    console.log(chalk.bold.cyan(`Ready to work on (${readyCount}):`));
    console.log();
  }
  
  nodesWithStatus.forEach((nodeInfo, index) => {
    const node = nodeInfo;
    const actualStatus = nodeInfo.actualStatus;
    const deps = nodeInfo.deps;
    const blocks = nodeInfo.blocks;
    
    // Print separator between ready and blocked
    if (index > 0 && nodesWithStatus[index - 1].actualStatus === 'ready' && actualStatus === 'blocked') {
      console.log();
      console.log(chalk.bold.red(`Blocked (${blockedCount}):`));
      console.log();
    }
    
    // Node header
    console.log(`${getStatusSymbol(actualStatus)} ${chalk.bold(node.id)} [${getStatusText(actualStatus)}]`);
    console.log(`   ${chalk.gray('Output:')} ${node.output}`);
    
    // Dependencies
    if (deps.length > 0) {
      const depsList = deps.map(dep => {
        const depStatus = computeNodeStatus(dep, projectDB);
        return `${getStatusSymbol(depStatus)} ${dep.id}`;
      }).join(', ');
      console.log(`   ${chalk.gray('Dependencies:')} ${depsList}`);
    }
    
    // What it blocks
    if (blocks.length > 0) {
      const isCriticalPath = blocks.length > 1;
      const blocksList = blocks.map(b => b.id).join(', ');
      let blocksText = `   ${chalk.gray('Blocks:')} ${blocksList}`;
      if (isCriticalPath) {
        blocksText += chalk.yellow(' [CRITICAL PATH]');
      }
      console.log(blocksText);
    }
    
    // Parent tactic
    if (node.parent_tactic) {
      console.log(`   ${chalk.gray('Part of:')} ${node.parent_tactic}`);
    }
    
    console.log();
  });
  
  // Summary
  if (readyCount > 0) {
    console.log(chalk.cyan(`💡 ${readyCount} goal(s) ready to work on now`));
  } else {
    console.log(chalk.yellow('⚠️  No goals are ready. Complete dependencies to unblock tasks.'));
  }
  
  projectDB.close();
}

/**
 * Generate Mermaid diagram for goals
 */
function generateMermaidGoals(options = {}) {
  const projectDB = new ProjectDB(getProjectDBPath()).open();
  const pendingNodes = getPendingNodes(projectDB);
  
  if (pendingNodes.length === 0) {
    projectDB.close();
    console.log('graph TD');
    console.log('  empty["All goals complete!"]');
    return;
  }
  
  // Compute actual status for each node
  const nodesWithStatus = pendingNodes.map(node => ({
    ...node,
    actualStatus: computeNodeStatus(node, projectDB),
    deps: projectDB.getDependencies(node.id)
  }));
  
  // Start mermaid graph
  let mermaid = 'graph TD\n';
  
  // Add nodes
  nodesWithStatus.forEach(node => {
    const nodeId = node.id.replace(/[^a-zA-Z0-9_]/g, '_');
    const status = node.actualStatus;
    
    // Choose shape and style based on status
    let shape = '[';
    let endShape = ']';
    let styleClass = '';
    
    if (status === 'ready') {
      shape = '['; endShape = ']';
      styleClass = 'ready';
    } else if (status === 'blocked') {
      shape = '['; endShape = ']';
      styleClass = 'blocked';
    }
    
    const label = `${node.id}<br/>${node.output}<br/>[${status.toUpperCase()}]`;
    mermaid += `  ${nodeId}${shape}"${label}"${endShape}\n`;
    
    if (styleClass) {
      mermaid += `  class ${nodeId} ${styleClass}\n`;
    }
  });
  
  // Add edges (dependencies)
  nodesWithStatus.forEach(node => {
    const toId = node.id.replace(/[^a-zA-Z0-9_]/g, '_');
    node.deps.forEach(dep => {
      const fromId = dep.id.replace(/[^a-zA-Z0-9_]/g, '_');
      mermaid += `  ${fromId} --> ${toId}\n`;
    });
  });
  
  // Add style definitions
  mermaid += '\n';
  mermaid += '  classDef ready fill:#87CEEB,stroke:#1976D2,stroke-width:2px\n';
  mermaid += '  classDef blocked fill:#FFB6C1,stroke:#C62828,stroke-width:2px\n';
  
  projectDB.close();
  console.log(mermaid);
}

module.exports = goalsCommand;
