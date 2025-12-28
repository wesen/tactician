#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const initCommand = require('./commands/init');
const { nodeShowCommand, nodeAddCommand, nodeEditCommand, nodeDeleteCommand } = require('./commands/node');
const graphCommand = require('./commands/graph');
const goalsCommand = require('./commands/goals');
const historyCommand = require('./commands/history');
const searchCommand = require('./commands/search');
const applyCommand = require('./commands/apply');

program
  .name('tactician')
  .description('Decompose software projects into task DAGs using reusable tactics')
  .version('1.0.0');

// Init command
program
  .command('init')
  .description('Initialize a new Tactician project')
  .action(initCommand);

// Node commands
const nodeCmd = program
  .command('node')
  .description('Manage nodes in the project graph');

nodeCmd
  .command('show <id>')
  .description('Show details for a node')
  .action(nodeShowCommand);

nodeCmd
  .command('add <id> <output>')
  .description('Add a new node')
  .option('--type <type>', 'Node type', 'project_artifact')
  .option('--status <status>', 'Initial status', 'pending')
  .action(nodeAddCommand);

nodeCmd
  .command('edit <id>')
  .description('Edit a node')
  .option('--status <status>', 'Update status (pending, complete)')
  .action(nodeEditCommand);

nodeCmd
  .command('delete <id>')
  .description('Delete a node')
  .option('--force', 'Force delete even if it blocks other nodes')
  .action(nodeDeleteCommand);

// Graph command
program
  .command('graph [goal-id]')
  .description('Display the project dependency graph')
  .option('--mermaid', 'Output as Mermaid diagram')
  .action(graphCommand);

// Goals command
program
  .command('goals')
  .description('List all open (incomplete) goals')
  .option('--mermaid', 'Output as Mermaid diagram')
  .action(goalsCommand);

// History command
program
  .command('history')
  .description('View action history and session summary')
  .option('-l, --limit <number>', 'Limit number of entries', parseInt)
  .option('-s, --since <time>', 'Show actions since (e.g., 1h, 2d, 30m)')
  .option('--summary', 'Show session summary instead of detailed log')
  .action(historyCommand);

// Search command
program
  .command('search [query]')
  .description('Search for applicable tactics')
  .option('--ready', 'Show only ready tactics (all dependencies satisfied)')
  .option('--type <type>', 'Filter by tactic type')
  .option('--tags <tags>', 'Filter by tags (comma-separated)')
  .option('--goals <goals>', 'Align with specific goal nodes (comma-separated)')
  .option('--llm-rerank', 'Use LLM to semantically rerank results')
  .option('-l, --limit <number>', 'Limit number of results', parseInt, 20)
  .option('-v, --verbose', 'Show detailed scoring information')
  .action(searchCommand);

// Apply command
program
  .command('apply <tactic-id>')
  .description('Apply a tactic to create new nodes')
  .option('-y, --yes', 'Skip confirmation prompt')
  .option('-f, --force', 'Apply even if dependencies are missing')
  .action(applyCommand);

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
