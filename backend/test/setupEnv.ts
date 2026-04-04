process.env.NODE_ENV ??= 'test';
process.env.JWT_SECRET ??= process.env.TEST_JWT_SECRET ?? 'local-jwt-signing-key-for-tests';
process.env.DATABASE_URL ??= process.env.TEST_DATABASE_URL ?? 'postgresql://localhost:5432/vox-test';
