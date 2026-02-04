const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.argv[2] || path.join('test', 'swagger-exam', 'results', 'devWebDB.db');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Failed to open DB:', err.message);
    process.exit(1);
  }
  console.log('Connected to', dbPath);
  runMetrics();
});

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function runMetrics() {
  try {
    const totalRows = await runQuery('SELECT COUNT(*) AS rows FROM Hits');
    const totalCalls = await runQuery('SELECT SUM(hits) AS calls FROM Hits');
    const codes = await runQuery('SELECT code, SUM(hits) AS calls FROM Hits GROUP BY code ORDER BY calls DESC');

    const txOverall = await runQuery('SELECT COUNT(*) AS count, AVG(duration) AS avg, MIN(duration) AS min, MAX(duration) AS max FROM Transactions');
    const txByName = await runQuery('SELECT name, COUNT(*) AS count, AVG(duration) AS avg, MIN(duration) AS min, MAX(duration) AS max FROM Transactions GROUP BY name ORDER BY count DESC');

    console.log('\n=== Calls (Hits) ===');
    console.log('Rows in Hits table:', totalRows[0] && totalRows[0].rows ? totalRows[0].rows : 0);
    console.log('Total calls (sum of hits):', totalCalls[0] && totalCalls[0].calls ? totalCalls[0].calls : 0);
    console.log('\nCalls by HTTP code:');
    console.table(codes);

    console.log('\n=== Transactions (Response Time) ===');
    if (txOverall && txOverall[0]) {
      console.log('Total transactions:', txOverall[0].count);
      console.log('Avg duration (ms):', Number(txOverall[0].avg).toFixed(2));
      console.log('Min duration (ms):', txOverall[0].min);
      console.log('Max duration (ms):', txOverall[0].max);
    }
    console.log('\nTransactions by name:');
    console.table(txByName.map(r => ({
      name: r.name,
      count: r.count,
      avg_ms: Number(r.avg).toFixed(2),
      min_ms: r.min,
      max_ms: r.max
    })));

  } catch (err) {
    console.error('Metrics error:', err.message);
  } finally {
    db.close();
  }
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught:', err && err.message);
  process.exit(1);
});
