const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ProjectDB = require('../db/project');
const TacticsDB = require('../db/tactics');
const { getTacticianDir, getProjectDBPath, getTacticsDBPath, printSuccess, printError } = require('../utils/helpers');

function initCommand() {
  const tacticianDir = getTacticianDir();
  
  // Check if already initialized
  if (fs.existsSync(tacticianDir)) {
    printError('Already initialized. .tactician/ directory exists.');
    process.exit(1);
  }

  try {
    // Create .tactician directory
    fs.mkdirSync(tacticianDir);
    
    // Initialize project database
    const projectDB = new ProjectDB(getProjectDBPath()).open();
    projectDB.initSchema();
    projectDB.setProjectMeta('untitled-project', null);
    projectDB.logAction('project_initialized', 'Initialized new Tactician project');
    projectDB.close();
    
    // Initialize tactics database
    const tacticsDB = new TacticsDB(getTacticsDBPath()).open();
    tacticsDB.initSchema();
    
    // Load default tactics
    const defaultTacticsPath = path.join(__dirname, '../../default-tactics/tactics.yaml');
    const tacticsYAML = fs.readFileSync(defaultTacticsPath, 'utf8');
    const count = tacticsDB.loadFromYAML(tacticsYAML);
    tacticsDB.close();
    
    printSuccess('Initialized .tactician/');
    printSuccess(`Loaded ${count} default tactics`);
    console.log();
    console.log(chalk.gray('Next steps:'));
    console.log(chalk.gray('  1. Add a root goal: tactician node add <id> <output> --status pending'));
    console.log(chalk.gray('  2. Search for tactics: tactician search --ready'));
    console.log(chalk.gray('  3. Apply a tactic: tactician apply <tactic-id>'));
    
  } catch (error) {
    printError(`Failed to initialize: ${error.message}`);
    // Clean up on failure
    if (fs.existsSync(tacticianDir)) {
      fs.rmSync(tacticianDir, { recursive: true, force: true });
    }
    process.exit(1);
  }
}

module.exports = initCommand;
