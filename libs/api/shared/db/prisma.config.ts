import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    // Placeholder keeps `prisma generate` working without a database (CI, fresh clones).
    url: process.env['DATABASE_URL'] ?? 'postgresql://menu:menu@localhost:5432/menu',
  },
});
