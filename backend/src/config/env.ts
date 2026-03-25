import 'dotenv/config';

function readRequired(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  jwtSecret: readRequired('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieName: process.env.COOKIE_NAME || 'vox_token',
  csrfCookieName: process.env.CSRF_COOKIE_NAME || 'vox_csrf',
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: readRequired('DATABASE_URL'),
};
