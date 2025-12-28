const Database = require('better-sqlite3');
const YAML = require('yaml');

class TacticsDB {
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
      CREATE TABLE IF NOT EXISTS tactics (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        output TEXT NOT NULL,
        description TEXT,
        tags TEXT,
        data TEXT
      );

      CREATE TABLE IF NOT EXISTS tactic_dependencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tactic_id TEXT NOT NULL,
        dependency_type TEXT NOT NULL,
        artifact_type TEXT NOT NULL,
        FOREIGN KEY (tactic_id) REFERENCES tactics(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS tactic_subtasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tactic_id TEXT NOT NULL,
        subtask_id TEXT NOT NULL,
        output TEXT NOT NULL,
        type TEXT NOT NULL,
        depends_on TEXT,
        data TEXT,
        FOREIGN KEY (tactic_id) REFERENCES tactics(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_tactics_type ON tactics(type);
      CREATE INDEX IF NOT EXISTS idx_tactic_deps ON tactic_dependencies(tactic_id);
      CREATE INDEX IF NOT EXISTS idx_tactic_subtasks ON tactic_subtasks(tactic_id);
    `);
  }

  addTactic(tactic) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO tactics (id, type, output, description, tags, data)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      tactic.id,
      tactic.type,
      tactic.output,
      tactic.description || null,
      tactic.tags ? tactic.tags.join(',') : null,
      tactic.data ? JSON.stringify(tactic.data) : null
    );

    // Delete existing dependencies and subtasks
    this.db.prepare('DELETE FROM tactic_dependencies WHERE tactic_id = ?').run(tactic.id);
    this.db.prepare('DELETE FROM tactic_subtasks WHERE tactic_id = ?').run(tactic.id);

    // Add match dependencies
    if (tactic.match && tactic.match.length > 0) {
      const depStmt = this.db.prepare('INSERT INTO tactic_dependencies (tactic_id, dependency_type, artifact_type) VALUES (?, ?, ?)');
      tactic.match.forEach(artifact => {
        depStmt.run(tactic.id, 'match', artifact);
      });
    }

    // Add premise dependencies
    if (tactic.premises && tactic.premises.length > 0) {
      const depStmt = this.db.prepare('INSERT INTO tactic_dependencies (tactic_id, dependency_type, artifact_type) VALUES (?, ?, ?)');
      tactic.premises.forEach(artifact => {
        depStmt.run(tactic.id, 'premise', artifact);
      });
    }

    // Add subtasks (check both top-level and data.subtasks)
    let subtasks = tactic.subtasks;
    if (!subtasks && tactic.data && tactic.data.subtasks) {
      subtasks = tactic.data.subtasks;
    }
    
    if (subtasks && subtasks.length > 0) {
      const subtaskStmt = this.db.prepare(`
        INSERT INTO tactic_subtasks (tactic_id, subtask_id, output, type, depends_on, data)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      subtasks.forEach(subtask => {
        subtaskStmt.run(
          tactic.id,
          subtask.id,
          subtask.output,
          subtask.type,
          subtask.depends_on ? subtask.depends_on.join(',') : null,
          subtask.data ? JSON.stringify(subtask.data) : null
        );
      });
    }
  }

  getTactic(id) {
    const stmt = this.db.prepare('SELECT * FROM tactics WHERE id = ?');
    const row = stmt.get(id);
    if (!row) return null;

    const tactic = {
      id: row.id,
      type: row.type,
      output: row.output,
      description: row.description,
      tags: row.tags ? row.tags.split(',') : [],
      data: row.data ? JSON.parse(row.data) : null
    };

    // Get dependencies
    const depsStmt = this.db.prepare('SELECT dependency_type, artifact_type FROM tactic_dependencies WHERE tactic_id = ?');
    const deps = depsStmt.all(id);
    
    tactic.match = deps.filter(d => d.dependency_type === 'match').map(d => d.artifact_type);
    tactic.premises = deps.filter(d => d.dependency_type === 'premise').map(d => d.artifact_type);

    // Get subtasks
    const subtasksStmt = this.db.prepare('SELECT * FROM tactic_subtasks WHERE tactic_id = ? ORDER BY id');
    const subtasks = subtasksStmt.all(id);
    
    if (subtasks.length > 0) {
      tactic.subtasks = subtasks.map(st => ({
        id: st.subtask_id,
        output: st.output,
        type: st.type,
        depends_on: st.depends_on ? st.depends_on.split(',') : [],
        data: st.data ? JSON.parse(st.data) : null
      }));
    }

    return tactic;
  }

  getAllTactics() {
    const stmt = this.db.prepare('SELECT id FROM tactics');
    const rows = stmt.all();
    return rows.map(row => this.getTactic(row.id));
  }

  searchTactics(filters = {}) {
    let query = 'SELECT DISTINCT t.id FROM tactics t';
    const conditions = [];
    const params = [];

    if (filters.type) {
      conditions.push('t.type = ?');
      params.push(filters.type);
    }

    if (filters.tags && filters.tags.length > 0) {
      const tagConditions = filters.tags.map(() => "t.tags LIKE ?");
      conditions.push(`(${tagConditions.join(' OR ')})`);
      filters.tags.forEach(tag => params.push(`%${tag}%`));
    }

    if (filters.keywords && filters.keywords.length > 0) {
      const keywordConditions = filters.keywords.map(() => 
        "(t.id LIKE ? OR t.description LIKE ? OR t.tags LIKE ?)"
      );
      conditions.push(`(${keywordConditions.join(' OR ')})`);
      filters.keywords.forEach(keyword => {
        const pattern = `%${keyword}%`;
        params.push(pattern, pattern, pattern);
      });
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);
    return rows.map(row => this.getTactic(row.id));
  }

  loadFromYAML(yamlContent) {
    const tactics = YAML.parse(yamlContent);
    
    if (!Array.isArray(tactics)) {
      throw new Error('YAML must contain an array of tactics');
    }

    tactics.forEach(tactic => {
      this.addTactic(tactic);
    });

    return tactics.length;
  }

  exportToYAML() {
    const tactics = this.getAllTactics();
    
    // Convert to YAML-friendly format
    const yamlData = tactics.map(tactic => {
      const data = {
        id: tactic.id,
        type: tactic.type,
        output: tactic.output
      };

      if (tactic.match && tactic.match.length > 0) {
        data.match = tactic.match;
      }

      if (tactic.premises && tactic.premises.length > 0) {
        data.premises = tactic.premises;
      }

      if (tactic.tags && tactic.tags.length > 0) {
        data.tags = tactic.tags;
      }

      if (tactic.description) {
        data.description = tactic.description;
      }

      if (tactic.subtasks && tactic.subtasks.length > 0) {
        data.subtasks = tactic.subtasks;
      }

      if (tactic.data) {
        data.data = tactic.data;
      }

      return data;
    });

    return YAML.stringify(yamlData);
  }
}

module.exports = TacticsDB;
