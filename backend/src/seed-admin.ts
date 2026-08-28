import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { pool } from './db';


async function seedAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) {
    console.error('ADMIN_EMAIL ist nicht gesetzt.');
    process.exit(1);
  }

  const { rowCount, rows } = await pool.query(
    'SELECT id, name FROM users WHERE email = $1',
    [email],
  );

  if (rowCount && rowCount > 0) {
    const { rows: updated } = await pool.query(
      `UPDATE users SET role = 'admin' WHERE id = $1 RETURNING id, name, email, role`,
      [rows[0].id],
    );
    console.log(`User ${updated[0].email} ist jetzt Admin (id=${updated[0].id}).`);
  } else {
    const name = process.env.ADMIN_NAME?.trim() || 'Admin';
    const password = process.env.ADMIN_PASSWORD;
    if (!password || password.length < 8) {
      console.error('ADMIN_PASSWORD (mind. 8 Zeichen) erforderlich, wenn der User noch nicht existiert.');
      process.exit(1);
    }
    const password_hash = await bcrypt.hash(password, 12);
    const { rows: created } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin') RETURNING id, name, email, role`,
      [name, email, password_hash],
    );
    console.log(`Admin ${created[0].email} angelegt (id=${created[0].id}).`);
  }

  await pool.end();
}

seedAdmin().catch((err) => {
  console.error('seed-admin fehlgeschlagen', err);
  process.exit(1);
});
