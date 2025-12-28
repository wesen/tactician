const chalk = require('chalk');
const readline = require('readline');
const ProjectDB = require('../db/project');
const TacticsDB = require('../db/tactics');
const { 
  ensureTacticianDir, 
  getProjectDBPath, 
  getTacticsDBPath,
  printHeader,
  printSuccess,
  printError,
  printWarning
} = require('../utils/helpers');

/**
 * Check if tactic dependencies are satisfied
 */
function checkDependencies(tactic, projectDB) {
  const allNodes = projectDB.getAllNodes();
  const completeOutputs = new Set(
    allNodes.filter(n => n.status === 'complete').map(n => n.output)
  );
  const existingOutputs = new Set(allNodes.map(n => n.output));
  
  const satisfied = new Set();
  const missing = new Set();
  const canIntroduce = new Set();
  
  // Check match dependencies (required)
  if (tactic.match && tactic.match.length > 0) {
    tactic.match.forEach(dep => {
      if (completeOutputs.has(dep)) {
        satisfied.add(dep);
      } else {
        missing.add(dep);
      }
    });
  }
  
  // Check premise dependencies (can be introduced)
  if (tactic.premises && tactic.premises.length > 0) {
    tactic.premises.forEach(dep => {
      // Skip if already in match dependencies
      if (tactic.match && tactic.match.includes(dep)) {
        return;
      }
      
      if (completeOutputs.has(dep)) {
        satisfied.add(dep);
      } else if (!existingOutputs.has(dep)) {
        canIntroduce.add(dep);
      } else {
        // Exists but not complete
        missing.add(dep);
      }
    });
  }
  
  return { 
    satisfied: Array.from(satisfied), 
    missing: Array.from(missing), 
    canIntroduce: Array.from(canIntroduce) 
  };
}

/**
 * Build dependency graph for subtasks
 */
function buildSubtaskGraph(subtasks) {
  const graph = new Map();
  
  subtasks.forEach(subtask => {
    graph.set(subtask.id, {
      subtask,
      dependsOn: subtask.depends_on || [],
      dependents: []
    });
  });
  
  // Build reverse edges (dependents)
  subtasks.forEach(subtask => {
    const deps = subtask.depends_on || [];
    deps.forEach(depId => {
      const depNode = graph.get(depId);
      if (depNode) {
        depNode.dependents.push(subtask.id);
      }
    });
  });
  
  return graph;
}

/**
 * Prompt user for confirmation
 */
function promptConfirm(message) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question(message + ' [y/n] ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function applyCommand(tacticId, options = {}) {
  ensureTacticianDir();
  
  const projectDB = new ProjectDB(getProjectDBPath()).open();
  const tacticsDB = new TacticsDB(getTacticsDBPath()).open();
  
  // Get the tactic
  const tactic = tacticsDB.getTactic(tacticId);
  if (!tactic) {
    projectDB.close();
    tacticsDB.close();
    printError(`Tactic not found: ${tacticId}`);
    process.exit(1);
  }
  
  // Check dependencies
  const depStatus = checkDependencies(tactic, projectDB);
  
  printHeader(`Applying: ${tacticId}`);
  console.log();
  console.log(chalk.bold('Type: ') + tactic.type);
  console.log(chalk.bold('Output: ') + tactic.output);
  
  if (tactic.description) {
    console.log(chalk.gray(tactic.description));
  }
  console.log();
  
  // Show dependency status
  if (depStatus.satisfied.length > 0) {
    console.log(chalk.green('✓ Satisfied: ') + depStatus.satisfied.join(', '));
  }
  
  if (depStatus.missing.length > 0) {
    console.log(chalk.red('✗ Missing: ') + depStatus.missing.join(', '));
    
    if (!options.force) {
      projectDB.close();
      tacticsDB.close();
      printError('Cannot apply tactic: missing required dependencies');
      console.log(chalk.gray('Use --force to apply anyway'));
      process.exit(1);
    } else {
      printWarning('Applying with missing dependencies (--force)');
    }
  }
  
  if (depStatus.canIntroduce.length > 0) {
    console.log(chalk.yellow('⚡ Will introduce: ') + depStatus.canIntroduce.join(', '));
  }
  
  console.log();
  
  // Determine what nodes will be created
  const nodesToCreate = [];
  
  // Introduce premise nodes if needed
  depStatus.canIntroduce.forEach(output => {
    nodesToCreate.push({
      id: output,
      type: 'document', // Default type for introduced nodes
      output: output,
      status: 'pending',
      introduced_as: 'premise',
      created_by: `tactic:${tacticId}`
    });
  });
  
  // Create subtask nodes or single output node
  if (tactic.subtasks && tactic.subtasks.length > 0) {
    tactic.subtasks.forEach(subtask => {
      nodesToCreate.push({
        id: subtask.id,
        type: subtask.type,
        output: subtask.output,
        status: 'pending',
        parent_tactic: tacticId,
        created_by: `tactic:${tacticId}`,
        data: subtask.data
      });
    });
  } else {
    // Simple tactic with single output
    nodesToCreate.push({
      id: tactic.output,
      type: tactic.type,
      output: tactic.output,
      status: 'pending',
      created_by: `tactic:${tacticId}`,
      data: tactic.data
    });
  }
  
  // Show what will be created
  console.log(chalk.bold(`This will create ${nodesToCreate.length} node(s):`));
  nodesToCreate.forEach(node => {
    const label = node.introduced_as ? chalk.yellow('[premise]') : 
                  node.parent_tactic ? chalk.cyan('[subtask]') : '';
    console.log(`  • ${chalk.bold(node.id)} ${label}`);
    console.log(`    ${chalk.gray('Type:')} ${node.type}, ${chalk.gray('Output:')} ${node.output}`);
  });
  console.log();
  
  // Show dependency structure for subtasks
  if (tactic.subtasks && tactic.subtasks.length > 0) {
    console.log(chalk.bold('Dependency structure:'));
    const graph = buildSubtaskGraph(tactic.subtasks);
    
    tactic.subtasks.forEach(subtask => {
      const node = graph.get(subtask.id);
      if (node.dependsOn.length > 0) {
        console.log(`  ${subtask.id} depends on: ${node.dependsOn.join(', ')}`);
      }
      if (node.dependents.length > 0) {
        console.log(`  ${subtask.id} blocks: ${node.dependents.join(', ')}`);
      }
    });
    console.log();
  }
  
  // Confirm with user unless --yes flag
  if (!options.yes) {
    const confirmed = await promptConfirm('Apply this tactic?');
    if (!confirmed) {
      projectDB.close();
      tacticsDB.close();
      console.log(chalk.gray('Cancelled.'));
      process.exit(0);
    }
  }
  
  // Create nodes
  const timestamp = new Date().toISOString();
  
  nodesToCreate.forEach(node => {
    node.created_at = timestamp;
    projectDB.addNode(node);
  });
  
  // Create edges for dependencies
  if (tactic.subtasks && tactic.subtasks.length > 0) {
    tactic.subtasks.forEach(subtask => {
      if (subtask.depends_on && subtask.depends_on.length > 0) {
        subtask.depends_on.forEach(depId => {
          projectDB.addEdge(depId, subtask.id);
        });
      }
    });
  }
  
  // Create edges from satisfied dependencies to new nodes
  depStatus.satisfied.forEach(dep => {
    // Find the node with this output
    const allNodes = projectDB.getAllNodes();
    const sourceNode = allNodes.find(n => n.output === dep);
    
    if (sourceNode) {
      // Connect to all new nodes that need this dependency
      nodesToCreate.forEach(newNode => {
        const needsDep = tactic.match && tactic.match.includes(dep);
        if (needsDep) {
          projectDB.addEdge(sourceNode.id, newNode.id);
        }
      });
    }
  });
  
  // Log the action
  projectDB.logAction('tactic_applied', `Applied tactic: ${tacticId}`, null, tacticId);
  
  projectDB.close();
  tacticsDB.close();
  
  printSuccess(`Created ${nodesToCreate.length} node(s)`);
  console.log();
  console.log(chalk.gray('Next steps:'));
  console.log(chalk.gray('  • Run "tactician goals" to see new tasks'));
  console.log(chalk.gray('  • Run "tactician graph" to visualize the DAG'));
}

module.exports = applyCommand;
