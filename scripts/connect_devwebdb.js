const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.argv[2] || path.join('test', 'swagger-exam', 'results', 'devWebDB.db');
const limitArg = process.argv[3] || '5';

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Failed to open DB:', err.message);
    process.exit(1);
  }
  console.log('Connected to', dbPath);
  inspect();
});

function inspect() {
  db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", (err, rows) => {
    if (err) {
      console.error('Error listing tables:', err.message);
      db.close();
      return;
    }
    if (!rows || rows.length === 0) {
      console.log('No tables found in database.');
      db.close();
      return;
    }
    const tables = rows.map(r => r.name);
    console.log('Tables:', tables.join(', '));

    // iterate tables sequentially and print up to 5 rows each
    (function next(i) {
      if (i >= tables.length) {
        db.close();
        return;
      }
      const t = tables[i];
      console.log(`\n-- ${t} (up to 5 rows) --`);
      const q = (limitArg === 'all') ? `SELECT * FROM ${t}` : `SELECT * FROM ${t} LIMIT ${parseInt(limitArg, 10) || 5}`;
      console.log(`Query: ${q}`);
      db.all(q, (err2, data) => {
        if (err2) {
          console.error(`Error reading table ${t}:`, err2.message);
        } else {
          if (data.length === 0) {
            console.log('(no rows)');
          } else {
            console.table(data);
          }
        }
        next(i + 1);
      });
    })(0);
  });
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught:', err && err.message);
  process.exit(1);
});
