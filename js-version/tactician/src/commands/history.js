const chalk = require('chalk');
const ProjectDB = require('../db/project');
const { 
  ensureTacticianDir, 
  getProjectDBPath, 
  formatTimestamp,
  printHeader
} = require('../utils/helpers');

function getActionIcon(action) {
  switch (action) {
    case 'project_initialized':
      return '🎬';
    case 'node_created':
      return '➕';
    case 'node_updated':
      return '📝';
    case 'node_completed':
      return '✅';
    case 'node_deleted':
      return '🗑️';
    case 'tactic_applied':
      return '⚡';
    default:
      return '•';
  }
}

function getActionColor(action) {
  switch (action) {
    case 'project_initialized':
      return chalk.cyan;
    case 'node_created':
      return chalk.green;
    case 'node_updated':
      return chalk.yellow;
    case 'node_completed':
      return chalk.bold.green;
    case 'node_deleted':
      return chalk.red;
    case 'tactic_applied':
      return chalk.magenta;
    default:
      return chalk.white;
  }
}

function historyCommand(options = {}) {
  ensureTacticianDir();
  
  const projectDB = new ProjectDB(getProjectDBPath()).open();
  
  let since = null;
  if (options.since) {
    // Parse relative time (e.g., "1h", "2d", "30m")
    const match = options.since.match(/^(\d+)([mhd])$/);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2];
      const now = new Date();
      
      switch (unit) {
        case 'm':
          now.setMinutes(now.getMinutes() - value);
          break;
        case 'h':
          now.setHours(now.getHours() - value);
          break;
        case 'd':
          now.setDate(now.getDate() - value);
          break;
      }
      
      since = now.toISOString();
    }
  }
  
  const logs = projectDB.getActionLog(options.limit, since);
  
  if (logs.length === 0) {
    projectDB.close();
    console.log(chalk.gray('No actions recorded yet.'));
    return;
  }
  
  // Show summary if requested
  if (options.summary) {
    const summary = projectDB.getSessionSummary(since);
    
    printHeader('Session Summary');
    console.log();
    console.log(chalk.bold('Total Actions:     ') + summary.total_actions);
    console.log(chalk.bold('Nodes Created:     ') + chalk.green(summary.nodes_created));
    console.log(chalk.bold('Nodes Completed:   ') + chalk.green(summary.nodes_completed));
    console.log(chalk.bold('Tactics Applied:   ') + chalk.magenta(summary.tactics_applied));
    console.log(chalk.bold('Nodes Modified:    ') + chalk.yellow(summary.nodes_modified));
    console.log();
    
    if (Object.keys(summary.actions_by_type).length > 0) {
      console.log(chalk.bold('Actions by Type:'));
      Object.entries(summary.actions_by_type).forEach(([action, count]) => {
        const icon = getActionIcon(action);
        const color = getActionColor(action);
        console.log(`  ${icon} ${color(action)}: ${count}`);
      });
      console.log();
    }
    
    projectDB.close();
    return;
  }
  
  // Show detailed log
  const title = since ? `Action History (last ${options.since || 'session'})` : 'Action History';
  printHeader(title);
  console.log();
  
  // Reverse to show chronological order (oldest first)
  const chronological = [...logs].reverse();
  
  chronological.forEach((log, index) => {
    const icon = getActionIcon(log.action);
    const color = getActionColor(log.action);
    const timestamp = formatTimestamp(log.timestamp);
    
    console.log(`${chalk.gray(timestamp)} ${icon} ${color(log.action)}`);
    
    if (log.details) {
      console.log(`  ${chalk.gray(log.details)}`);
    }
    
    if (log.node_id) {
      console.log(`  ${chalk.gray('Node:')} ${log.node_id}`);
    }
    
    if (log.tactic_id) {
      console.log(`  ${chalk.gray('Tactic:')} ${log.tactic_id}`);
    }
    
    // Add spacing between entries
    if (index < chronological.length - 1) {
      console.log();
    }
  });
  
  console.log();
  console.log(chalk.gray(`Showing ${logs.length} action(s)`));
  
  projectDB.close();
}

module.exports = historyCommand;
