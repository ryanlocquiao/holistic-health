require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../db/index');

const ADMIN = {
    email: 'admin@hh.local',
    password: 'hhadmin1221',
};

async function seedAdmin() {
    try {
        const existing = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [ADMIN.email]
        );

        if (existing.rows.length > 0) {
            console.log(`Admin already exists (id: ${existing.rows[0].id}) - skipping.`);
            await pool.end();
            return;
        }

        const passwordHash = await bcrypt.hash(ADMIN.password, 12);

        const result = await pool.query(
            `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email`,
            [ADMIN.email, passwordHash]
        );

        console.log('Admin account created:', result.rows[0]);
        await pool.end();
    } catch (err) {
        console.error('Seed admin error:', err.message);
        await pool.end();
        process.exit(1);
    }
}

seedAdmin();