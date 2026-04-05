require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./index');
const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

pool.query(sql).
    then(() => {
        console.log('Migration successful - all tables created.');
        process.exit(0);
    })
    .catch(err => {
        console.error('Migration failed:', err.message);
        process.exit(1);
    });