const chalk = require('chalk');
const ProjectDB = require('../db/project');
const TacticsDB = require('../db/tactics');
const LLMReranker = require('../llm/reranker');
const { 
  ensureTacticianDir, 
  getProjectDBPath, 
  getTacticsDBPath,
  getStatusSymbol,
  computeNodeStatus,
  printHeader
} = require('../utils/helpers');

/**
 * Compute dependency status for a tactic
 * Returns: { ready: boolean, satisfied: string[], missing: string[], canIntroduce: string[] }
 */
function computeTacticDependencyStatus(tactic, projectDB) {
  const allNodes = projectDB.getAllNodes();
  const nodeOutputs = new Set(allNodes.map(n => n.output));
  const completeOutputs = new Set(
    allNodes.filter(n => n.status === 'complete').map(n => n.output)
  );
  
  const satisfied = [];
  const missing = [];
  const canIntroduce = [];
  
  // Check match dependencies (required)
  if (tactic.match && tactic.match.length > 0) {
    tactic.match.forEach(dep => {
      if (completeOutputs.has(dep)) {
        satisfied.push(dep);
      } else if (nodeOutputs.has(dep)) {
        // Exists but not complete - this is a problem
        missing.push(dep);
      } else {
        // Doesn't exist at all
        missing.push(dep);
      }
    });
  }
  
  // Check premise dependencies (optional, can be introduced)
  if (tactic.premises && tactic.premises.length > 0) {
    tactic.premises.forEach(dep => {
      if (completeOutputs.has(dep)) {
        satisfied.push(dep);
      } else if (nodeOutputs.has(dep)) {
        // Exists but not complete
        missing.push(dep);
      } else {
        // Can introduce this
        canIntroduce.push(dep);
      }
    });
  }
  
  // Ready if all match dependencies are satisfied
  // Premises can be missing (will be introduced)
  const matchDeps = tactic.match || [];
  const allMatchSatisfied = matchDeps.every(dep => completeOutputs.has(dep));
  
  return {
    ready: allMatchSatisfied,
    satisfied,
    missing,
    canIntroduce
  };
}

/**
 * Compute critical path impact score
 * Higher score if completing this tactic would unblock more nodes
 */
function computeCriticalPathScore(tactic, projectDB) {
  // Count how many pending nodes would be unblocked if this tactic's output completes
  const allNodes = projectDB.getAllNodes();
  const pendingNodes = allNodes.filter(n => n.status === 'pending');
  
  let unblockCount = 0;
  
  pendingNodes.forEach(node => {
    const deps = projectDB.getDependencies(node.id);
    const blockedBy = deps.filter(d => d.status !== 'complete');
    
    // Check if this tactic's output is one of the blockers
    if (blockedBy.some(d => d.output === tactic.output)) {
      // Check if this is the ONLY blocker
      if (blockedBy.length === 1) {
        unblockCount += 2; // Direct unblock is worth more
      } else {
        unblockCount += 1; // Partial unblock
      }
    }
  });
  
  return unblockCount;
}

/**
 * Compute keyword relevance score
 * Matches against id, tags, and description
 */
function computeKeywordScore(tactic, keywords) {
  if (!keywords || keywords.length === 0) return 0;
  
  let score = 0;
  const idLower = tactic.id.toLowerCase();
  const descLower = (tactic.description || '').toLowerCase();
  const tagsLower = (tactic.tags || []).map(t => t.toLowerCase());
  
  keywords.forEach(keyword => {
    const kw = keyword.toLowerCase();
    
    // ID match is highest priority
    if (idLower.includes(kw)) {
      score += 10;
    }
    
    // Tag match is medium priority
    if (tagsLower.some(tag => tag.includes(kw))) {
      score += 5;
    }
    
    // Description match is lowest priority
    if (descLower.includes(kw)) {
      score += 2;
    }
  });
  
  return score;
}

/**
 * Compute goal alignment score
 * Higher if tactic helps complete specified goals
 */
function computeGoalAlignmentScore(tactic, goalIds, projectDB) {
  if (!goalIds || goalIds.length === 0) return 0;
  
  let score = 0;
  
  goalIds.forEach(goalId => {
    const goal = projectDB.getNode(goalId);
    if (!goal) return;
    
    // Check if tactic output matches goal output
    if (tactic.output === goal.output) {
      score += 20;
    }
    
    // Check if tactic output is a dependency of the goal
    const deps = projectDB.getDependencies(goalId);
    if (deps.some(d => d.output === tactic.output)) {
      score += 10;
    }
  });
  
  return score;
}

/**
 * Rank tactics using multi-factor scoring
 */
function rankTactics(tactics, projectDB, options = {}) {
  const rankedTactics = tactics.map(tactic => {
    const depStatus = computeTacticDependencyStatus(tactic, projectDB);
    const criticalPathScore = computeCriticalPathScore(tactic, projectDB);
    const keywordScore = computeKeywordScore(tactic, options.keywords);
    const goalScore = computeGoalAlignmentScore(tactic, options.goals, projectDB);
    
    // Weighted total score
    let totalScore = 0;
    
    // Dependency status is most important
    if (depStatus.ready) {
      totalScore += 1000; // Ready tactics get huge boost
    } else {
      totalScore -= 500; // Not ready gets penalty
    }
    
    // Critical path impact
    totalScore += criticalPathScore * 50;
    
    // Keyword relevance
    totalScore += keywordScore * 10;
    
    // Goal alignment
    totalScore += goalScore * 5;
    
    return {
      tactic,
      depStatus,
      scores: {
        total: totalScore,
        criticalPath: criticalPathScore,
        keyword: keywordScore,
        goal: goalScore
      }
    };
  });
  
  // Sort by total score descending
  rankedTactics.sort((a, b) => b.scores.total - a.scores.total);
  
  return rankedTactics;
}

async function searchCommand(query, options = {}) {
  if (options.verbose) {
    console.log('Query:', query);
    console.log('Options:', options);
  }
  ensureTacticianDir();
  
  const projectDB = new ProjectDB(getProjectDBPath()).open();
  const tacticsDB = new TacticsDB(getTacticsDBPath()).open();
  
  // Get all tactics
  let tactics = tacticsDB.getAllTactics();
  
  // Apply filters
  if (options.type) {
    tactics = tactics.filter(t => t.type === options.type);
  }
  
  if (options.tags) {
    const filterTags = options.tags.split(',').map(t => t.trim());
    tactics = tactics.filter(t => 
      t.tags && t.tags.some(tag => filterTags.includes(tag))
    );
  }
  
  // Parse keywords from query
  const keywords = query ? query.split(/\s+/).filter(Boolean) : [];
  
  // Parse goal IDs
  const goalIds = options.goals ? options.goals.split(',').map(g => g.trim()) : [];
  
  // Rank tactics
  const ranked = rankTactics(tactics, projectDB, { keywords, goals: goalIds });
  
  // Filter by ready status if requested
  let filtered = ranked;
  if (options.ready) {
    filtered = ranked.filter(r => r.depStatus.ready);
  }
  
  // Apply LLM reranking if requested
  if (options.llmRerank) {
    console.log(chalk.gray('🤖 Reranking with LLM...'));
    const reranker = new LLMReranker();
    filtered = await reranker.rerank(query, filtered, projectDB, { verbose: options.verbose });
    console.log(chalk.green('✓ Reranking complete'));
    console.log();
  }
  
  // Limit results
  const limit = options.limit || 20;
  const results = filtered.slice(0, limit);
  
  if (results.length === 0) {
    projectDB.close();
    tacticsDB.close();
    console.log(chalk.gray('No tactics found matching criteria.'));
    return;
  }
  
  // Display results
  const title = options.ready ? 'Ready Tactics' : 'Search Results';
  printHeader(`${title} (${results.length}${filtered.length > limit ? `/${filtered.length}` : ''})`);
  console.log();
  
  results.forEach((result, index) => {
    const { tactic, depStatus, scores } = result;
    
    // Tactic header
    const statusIcon = depStatus.ready ? chalk.green('✓') : chalk.red('✗');
    console.log(`${index + 1}. ${chalk.bold(tactic.id)} → ${chalk.cyan(tactic.output)}`);
    console.log(`   ${chalk.gray('Type:')} ${tactic.type}`);
    
    // Status
    if (depStatus.ready) {
      console.log(`   ${statusIcon} ${chalk.green('READY')}`);
    } else {
      console.log(`   ${statusIcon} ${chalk.red('NOT READY')}`);
    }
    
    // Dependencies
    if (depStatus.satisfied.length > 0) {
      console.log(`   ${chalk.gray('Satisfied:')} ${depStatus.satisfied.map(d => chalk.green('✓ ' + d)).join(', ')}`);
    }
    
    if (depStatus.missing.length > 0) {
      console.log(`   ${chalk.gray('Missing:')} ${depStatus.missing.map(d => chalk.red('✗ ' + d)).join(', ')}`);
    }
    
    if (depStatus.canIntroduce.length > 0) {
      console.log(`   ${chalk.gray('Can introduce:')} ${depStatus.canIntroduce.map(d => chalk.yellow('⚡ ' + d)).join(', ')}`);
    }
    
    // Tags
    if (tactic.tags && tactic.tags.length > 0) {
      console.log(`   ${chalk.gray('Tags:')} ${tactic.tags.join(', ')}`);
    }
    
    // Description
    if (tactic.description) {
      console.log(`   ${chalk.gray(tactic.description)}`);
    }
    
    // Subtasks
    if (tactic.subtasks && tactic.subtasks.length > 0) {
      console.log(`   ${chalk.gray('Subtasks:')} ${tactic.subtasks.length} (${tactic.subtasks.map(s => s.id).join(', ')})`);
    }
    
    // Scores (if verbose)
    if (options.verbose) {
      console.log(`   ${chalk.gray('Scores:')} total=${scores.total}, critical=${scores.criticalPath}, keyword=${scores.keyword}, goal=${scores.goal}`);
    }
    
    console.log();
  });
  
  // Footer
  if (options.ready) {
    console.log(chalk.cyan(`💡 ${results.length} tactic(s) ready to apply`));
  } else {
    const readyCount = results.filter(r => r.depStatus.ready).length;
    console.log(chalk.gray(`${readyCount} ready, ${results.length - readyCount} not ready`));
  }
  
  projectDB.close();
  tacticsDB.close();
}

module.exports = searchCommand;
