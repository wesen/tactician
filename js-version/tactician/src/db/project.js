const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

class ProjectDB {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
  }

  open() {
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    return this;
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS project (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        output TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_by TEXT,
        created_at TEXT NOT NULL,
        completed_at TEXT,
        parent_tactic TEXT,
        introduced_as TEXT,
        data TEXT
      );

      CREATE TABLE IF NOT EXISTS edges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_node_id TEXT NOT NULL,
        target_node_id TEXT NOT NULL,
        FOREIGN KEY (source_node_id) REFERENCES nodes(id) ON DELETE CASCADE,
        FOREIGN KEY (target_node_id) REFERENCES nodes(id) ON DELETE CASCADE,
        UNIQUE(source_node_id, target_node_id)
      );

      CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_node_id);
      CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_node_id);
      CREATE INDEX IF NOT EXISTS idx_nodes_status ON nodes(status);

      CREATE TABLE IF NOT EXISTS action_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        node_id TEXT,
        tactic_id TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_log_timestamp ON action_log(timestamp);
      CREATE INDEX IF NOT EXISTS idx_log_action ON action_log(action);
    `);
  }

  setProjectMeta(name, rootGoal) {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO project (key, value) VALUES (?, ?)');
    stmt.run('name', name);
    stmt.run('root_goal', rootGoal);
  }

  getProjectMeta() {
    const stmt = this.db.prepare('SELECT key, value FROM project');
    const rows = stmt.all();
    const meta = {};
    rows.forEach(row => {
      meta[row.key] = row.value;
    });
    return meta;
  }

  addNode(node) {
    const stmt = this.db.prepare(`
      INSERT INTO nodes (id, type, output, status, created_by, created_at, completed_at, parent_tactic, introduced_as, data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      node.id,
      node.type,
      node.output,
      node.status || 'pending',
      node.created_by || null,
      node.created_at || new Date().toISOString(),
      node.completed_at || null,
      node.parent_tactic || null,
      node.introduced_as || null,
      node.data ? JSON.stringify(node.data) : null
    );
  }

  getNode(id) {
    const stmt = this.db.prepare('SELECT * FROM nodes WHERE id = ?');
    const row = stmt.get(id);
    if (!row) return null;
    
    return {
      ...row,
      data: row.data ? JSON.parse(row.data) : null
    };
  }

  getAllNodes() {
    const stmt = this.db.prepare('SELECT * FROM nodes');
    const rows = stmt.all();
    return rows.map(row => ({
      ...row,
      data: row.data ? JSON.parse(row.data) : null
    }));
  }

  updateNodeStatus(id, status, completedAt = null) {
    const stmt = this.db.prepare('UPDATE nodes SET status = ?, completed_at = ? WHERE id = ?');
    stmt.run(status, completedAt, id);
  }

  deleteNode(id) {
    // Edges will be deleted automatically due to CASCADE
    const stmt = this.db.prepare('DELETE FROM nodes WHERE id = ?');
    stmt.run(id);
  }

  addEdge(sourceId, targetId) {
    const stmt = this.db.prepare('INSERT OR IGNORE INTO edges (source_node_id, target_node_id) VALUES (?, ?)');
    stmt.run(sourceId, targetId);
  }

  getEdges() {
    const stmt = this.db.prepare('SELECT source_node_id, target_node_id FROM edges');
    return stmt.all();
  }

  getDependencies(nodeId) {
    // Get nodes that this node depends on (incoming edges)
    const stmt = this.db.prepare(`
      SELECT n.* FROM nodes n
      INNER JOIN edges e ON e.source_node_id = n.id
      WHERE e.target_node_id = ?
    `);
    const rows = stmt.all(nodeId);
    return rows.map(row => ({
      ...row,
      data: row.data ? JSON.parse(row.data) : null
    }));
  }

  getBlockedBy(nodeId) {
    // Get nodes that are blocked by this node (outgoing edges)
    const stmt = this.db.prepare(`
      SELECT n.* FROM nodes n
      INNER JOIN edges e ON e.target_node_id = n.id
      WHERE e.source_node_id = ?
    `);
    const rows = stmt.all(nodeId);
    return rows.map(row => ({
      ...row,
      data: row.data ? JSON.parse(row.data) : null
    }));
  }

  exportToYAML() {
    const meta = this.getProjectMeta();
    const nodes = this.getAllNodes();
    const edges = this.getEdges();

    // Build YAML structure
    const yamlData = {
      project: {
        name: meta.name || 'untitled',
        root_goal: meta.root_goal || null
      },
      nodes: {}
    };

    // Convert nodes to YAML format
    nodes.forEach(node => {
      const nodeData = {
        type: node.type,
        output: node.output,
        status: node.status
      };

      if (node.created_by) nodeData.created_by = node.created_by;
      if (node.created_at) nodeData.created_at = node.created_at;
      if (node.completed_at) nodeData.completed_at = node.completed_at;
      if (node.parent_tactic) nodeData.parent_tactic = node.parent_tactic;
      if (node.introduced_as) nodeData.introduced_as = node.introduced_as;

      // Add dependencies
      const deps = this.getDependencies(node.id);
      if (deps.length > 0) {
        nodeData.dependencies = {
          match: deps.map(d => d.id)
        };
      }

      // Add blocks
      const blocks = this.getBlockedBy(node.id);
      if (blocks.length > 0) {
        nodeData.blocks = blocks.map(b => b.id);
      }

      if (node.data) {
        nodeData.data = node.data;
      }

      yamlData.nodes[node.id] = nodeData;
    });

    return YAML.stringify(yamlData);
  }

  logAction(action, details = null, nodeId = null, tacticId = null) {
    const stmt = this.db.prepare(`
      INSERT INTO action_log (timestamp, action, details, node_id, tactic_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      new Date().toISOString(),
      action,
      details,
      nodeId,
      tacticId
    );
  }

  getActionLog(limit = null, since = null) {
    let query = 'SELECT * FROM action_log';
    const params = [];

    if (since) {
      query += ' WHERE timestamp >= ?';
      params.push(since);
    }

    query += ' ORDER BY timestamp DESC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(limit);
    }

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  getSessionSummary(since = null) {
    const logs = this.getActionLog(null, since);
    
    const summary = {
      total_actions: logs.length,
      nodes_created: 0,
      nodes_completed: 0,
      tactics_applied: 0,
      nodes_modified: 0,
      actions_by_type: {}
    };

    logs.forEach(log => {
      // Count by action type
      summary.actions_by_type[log.action] = (summary.actions_by_type[log.action] || 0) + 1;

      // Count specific actions
      if (log.action === 'node_created') summary.nodes_created++;
      if (log.action === 'node_completed') summary.nodes_completed++;
      if (log.action === 'tactic_applied') summary.tactics_applied++;
      if (log.action === 'node_updated') summary.nodes_modified++;
    });

    return summary;
  }

  importFromYAML(yamlContent) {
    const data = YAML.parse(yamlContent);

    // Clear existing data
    this.db.exec('DELETE FROM edges');
    this.db.exec('DELETE FROM nodes');
    this.db.exec('DELETE FROM project');

    // Set project meta
    if (data.project) {
      this.setProjectMeta(data.project.name, data.project.root_goal);
    }

    // Add nodes
    if (data.nodes) {
      Object.entries(data.nodes).forEach(([id, nodeData]) => {
        this.addNode({
          id,
          type: nodeData.type,
          output: nodeData.output,
          status: nodeData.status || 'pending',
          created_by: nodeData.created_by,
          created_at: nodeData.created_at,
          completed_at: nodeData.completed_at,
          parent_tactic: nodeData.parent_tactic,
          introduced_as: nodeData.introduced_as,
          data: nodeData.data
        });
      });

      // Add edges from dependencies
      Object.entries(data.nodes).forEach(([targetId, nodeData]) => {
        if (nodeData.dependencies && nodeData.dependencies.match) {
          nodeData.dependencies.match.forEach(sourceId => {
            this.addEdge(sourceId, targetId);
          });
        }
      });
    }
  }
}

module.exports = ProjectDB;
