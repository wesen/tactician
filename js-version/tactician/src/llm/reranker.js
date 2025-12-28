const { OpenAI } = require('openai');

/**
 * LLM-based reranking for search results
 * Uses OpenAI API to semantically rerank tactics based on project context
 */

class LLMReranker {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.model = process.env.TACTICIAN_LLM_MODEL || 'gpt-4.1-mini';
    this.maxTacticsToRerank = parseInt(process.env.TACTICIAN_RERANK_LIMIT || '10');
  }

  /**
   * Build context about the project state
   */
  buildProjectContext(projectDB) {
    const allNodes = projectDB.getAllNodes();
    const pendingNodes = allNodes.filter(n => n.status === 'pending');
    const completeNodes = allNodes.filter(n => n.status === 'complete');
    
    let context = 'Project State:\n';
    context += `- ${completeNodes.length} completed nodes\n`;
    context += `- ${pendingNodes.length} pending nodes\n\n`;
    
    if (completeNodes.length > 0) {
      context += 'Completed outputs:\n';
      completeNodes.forEach(n => {
        context += `  - ${n.output} (${n.type})\n`;
      });
      context += '\n';
    }
    
    if (pendingNodes.length > 0) {
      context += 'Pending goals:\n';
      pendingNodes.slice(0, 10).forEach(n => {
        context += `  - ${n.id}: ${n.output} (${n.type})\n`;
      });
      if (pendingNodes.length > 10) {
        context += `  ... and ${pendingNodes.length - 10} more\n`;
      }
      context += '\n';
    }
    
    return context;
  }

  /**
   * Build prompt for LLM reranking
   */
  buildRerankPrompt(query, tactics, projectContext) {
    let prompt = `You are helping a software developer choose the best tactic to apply next in their project.

${projectContext}

User's search query: "${query || 'looking for next steps'}"

Here are ${tactics.length} candidate tactics, ranked by heuristics:

`;

    tactics.forEach((tactic, index) => {
      prompt += `${index + 1}. ${tactic.id}
   Type: ${tactic.type}
   Output: ${tactic.output}
   Description: ${tactic.description || 'No description'}
   Tags: ${tactic.tags ? tactic.tags.join(', ') : 'none'}
   Dependencies: ${tactic.match ? tactic.match.join(', ') : 'none'}
   ${tactic.subtasks ? `Subtasks: ${tactic.subtasks.length}` : ''}

`;
    });

    prompt += `Based on the project state and the user's query, rerank these tactics from most to least relevant.
Consider:
1. Semantic match with the user's intent
2. Logical next steps in the project workflow
3. Dependencies that are already satisfied
4. Impact on unblocking other work

Respond with ONLY a JSON array of tactic IDs in the new order, like:
["tactic_id_1", "tactic_id_2", "tactic_id_3", ...]

Do not include any other text or explanation.`;

    return prompt;
  }

  /**
   * Call LLM to rerank tactics
   */
  async rerank(query, rankedTactics, projectDB, options = {}) {
    try {
      // Limit number of tactics to rerank
      const tacticsToRerank = rankedTactics.slice(0, this.maxTacticsToRerank);
      
      if (tacticsToRerank.length === 0) {
        return rankedTactics;
      }
      
      // Extract just the tactic objects
      const tactics = tacticsToRerank.map(r => r.tactic);
      
      // Build context and prompt
      const projectContext = this.buildProjectContext(projectDB);
      const prompt = this.buildRerankPrompt(query, tactics, projectContext);
      
      if (options.verbose) {
        console.log('\n--- LLM Reranking Prompt ---');
        console.log(prompt);
        console.log('--- End Prompt ---\n');
      }
      
      // Call LLM
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that ranks software development tactics.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });
      
      const content = response.choices[0].message.content.trim();
      
      if (options.verbose) {
        console.log('\n--- LLM Response ---');
        console.log(content);
        console.log('--- End Response ---\n');
      }
      
      // Parse response
      const newOrder = JSON.parse(content);
      
      if (!Array.isArray(newOrder)) {
        throw new Error('LLM response is not an array');
      }
      
      // Reorder tactics based on LLM response
      const tacticMap = new Map(tacticsToRerank.map(r => [r.tactic.id, r]));
      const reranked = [];
      
      newOrder.forEach(tacticId => {
        if (tacticMap.has(tacticId)) {
          reranked.push(tacticMap.get(tacticId));
          tacticMap.delete(tacticId);
        }
      });
      
      // Add any tactics that weren't in the LLM response
      tacticMap.forEach(tactic => {
        reranked.push(tactic);
      });
      
      // Add back tactics that weren't reranked (beyond the limit)
      const remaining = rankedTactics.slice(this.maxTacticsToRerank);
      
      return [...reranked, ...remaining];
      
    } catch (error) {
      if (options.verbose) {
        console.error('\n--- LLM Reranking Error ---');
        console.error(error.message);
        console.error('--- End Error ---\n');
      }
      
      // Fallback to original ranking on error
      console.warn('LLM reranking failed, using heuristic ranking');
      return rankedTactics;
    }
  }
}

module.exports = LLMReranker;
