import { Pool } from 'pg';
import { CONFIG } from './config';

export const pool = new Pool({
  host: CONFIG.POSTGRES.HOST,
  port: CONFIG.POSTGRES.PORT,
  user: CONFIG.POSTGRES.USER,
  password: CONFIG.POSTGRES.PASSWORD,
  database: CONFIG.POSTGRES.DB,
});

export const initDB = async () => {
  const client = await pool.connect();
  try {
    console.log('Initializing Database...');
    
    // Table: calendar_sync_state
    await client.query(`
      CREATE TABLE IF NOT EXISTS calendar_sync_state (
        calendar_id VARCHAR(255) PRIMARY KEY,
        sync_token VARCHAR(255),
        channel_id VARCHAR(255),
        resource_id VARCHAR(255),
        expiration BIGINT,
        last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Table: calendar_events_snapshot
    await client.query(`
      CREATE TABLE IF NOT EXISTS calendar_events_snapshot (
        calendar_id VARCHAR(255),
        event_id VARCHAR(255),
        event_data JSONB,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (calendar_id, event_id)
      );
    `);

    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
};
