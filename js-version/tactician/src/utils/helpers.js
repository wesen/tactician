const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

function getTacticianDir() {
  return path.join(process.cwd(), '.tactician');
}

function getProjectDBPath() {
  return path.join(getTacticianDir(), 'project.db');
}

function getTacticsDBPath() {
  return path.join(getTacticianDir(), 'tactics.db');
}

function getProjectYAMLPath() {
  return path.join(getTacticianDir(), 'project.yaml');
}

function getTacticsYAMLPath() {
  return path.join(getTacticianDir(), 'tactics.yaml');
}

function ensureTacticianDir() {
  const dir = getTacticianDir();
  if (!fs.existsSync(dir)) {
    throw new Error('Not a Tactician project. Run "tactician init" first.');
  }
  return dir;
}

function getStatusSymbol(status) {
  switch (status) {
    case 'complete':
      return chalk.green('✓');
    case 'pending':
      return chalk.yellow('⏳');
    case 'ready':
      return chalk.cyan('⚡');
    case 'blocked':
      return chalk.red('🚫');
    default:
      return chalk.gray('○');
  }
}

function getStatusText(status) {
  switch (status) {
    case 'complete':
      return chalk.green('COMPLETE');
    case 'pending':
      return chalk.yellow('PENDING');
    case 'ready':
      return chalk.cyan('READY');
    case 'blocked':
      return chalk.red('BLOCKED');
    default:
      return chalk.gray('UNKNOWN');
  }
}

function formatTimestamp(timestamp) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

function computeNodeStatus(node, projectDB) {
  if (node.status === 'complete') {
    return 'complete';
  }

  // Check if all dependencies are complete
  const deps = projectDB.getDependencies(node.id);
  
  if (deps.length === 0) {
    return 'ready';
  }

  const allComplete = deps.every(dep => dep.status === 'complete');
  return allComplete ? 'ready' : 'blocked';
}

function getNodesByStatus(projectDB, status) {
  const allNodes = projectDB.getAllNodes();
  return allNodes.filter(node => {
    const actualStatus = computeNodeStatus(node, projectDB);
    return actualStatus === status;
  });
}

function getReadyNodes(projectDB) {
  return getNodesByStatus(projectDB, 'ready');
}

function getBlockedNodes(projectDB) {
  return getNodesByStatus(projectDB, 'blocked');
}

function getPendingNodes(projectDB) {
  const allNodes = projectDB.getAllNodes();
  return allNodes.filter(node => node.status === 'pending');
}

function printSeparator(char = '━', length = 50) {
  console.log(chalk.gray(char.repeat(length)));
}

function printHeader(text) {
  console.log();
  console.log(chalk.bold.cyan(text));
  printSeparator();
}

function printSuccess(text) {
  console.log(chalk.green('✓') + ' ' + text);
}

function printError(text) {
  console.log(chalk.red('✗') + ' ' + text);
}

function printWarning(text) {
  console.log(chalk.yellow('⚠️ ') + ' ' + text);
}

function printInfo(text) {
  console.log(chalk.blue('ℹ') + ' ' + text);
}

module.exports = {
  getTacticianDir,
  getProjectDBPath,
  getTacticsDBPath,
  getProjectYAMLPath,
  getTacticsYAMLPath,
  ensureTacticianDir,
  getStatusSymbol,
  getStatusText,
  formatTimestamp,
  computeNodeStatus,
  getNodesByStatus,
  getReadyNodes,
  getBlockedNodes,
  getPendingNodes,
  printSeparator,
  printHeader,
  printSuccess,
  printError,
  printWarning,
  printInfo
};
