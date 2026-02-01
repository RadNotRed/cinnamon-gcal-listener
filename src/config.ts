import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  LOGGED_CAL_IDS: (process.env.LOGGED_CAL_IDS || '').split(',').map(id => id.trim()).filter(id => id.length > 0),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
  GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY || '',
  WEBHOOK_BASE_URL: process.env.WEBHOOK_BASE_URL || '',
  PORT: parseInt(process.env.PORT || '3000', 10),
  POSTGRES: {
    HOST: process.env.POSTGRES_HOST || 'localhost',
    PORT: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    USER: process.env.POSTGRES_USER || 'postgres',
    PASSWORD: process.env.POSTGRES_PASSWORD || '',
    DB: process.env.POSTGRES_DB || 'calendar_listener',
  }
};

// Validation
if (!CONFIG.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
  console.warn('WARNING: GOOGLE_SERVICE_ACCOUNT_EMAIL is not set.');
}
if (!CONFIG.GOOGLE_PRIVATE_KEY) {
  console.warn('WARNING: GOOGLE_PRIVATE_KEY is not set.');
}
if (CONFIG.LOGGED_CAL_IDS.length === 0) {
  console.warn('WARNING: LOGGED_CAL_IDS is not set.');
}
