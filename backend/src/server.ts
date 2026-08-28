import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';

const PORT = Number(process.env.PORT ?? 3000);

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET ist nicht gesetzt — Backend startet nicht.');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL ist nicht gesetzt — Backend startet nicht.');
  process.exit(1);
}

const app = createApp();
app.listen(PORT, () => {
  console.log(`Ticketing-Backend läuft auf http://localhost:${PORT}`);
});
