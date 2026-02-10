import { startServer } from './server';
import { initDB } from './db';
import { ensureSubscriptions, startSubscriptionRenewalLoop } from './subscription';
import { CONFIG } from './config';

const main = async () => {
  try {
    console.log('Starting Google Calendar Listener...');
    
    // 1. Init DB
    await initDB();

    // 2. Start Server (Need to be running to verify webhook if we were doing sync setup here, 
    // but we can start it first).
    startServer();

    // 3. Ensure Subscriptions
    // Note: ensureSubscriptions makes outgoing calls to Google.
    if (CONFIG.WEBHOOK_BASE_URL && !CONFIG.WEBHOOK_BASE_URL.includes('localhost')) {
       await ensureSubscriptions();
       startSubscriptionRenewalLoop();
    } else {
       console.warn('WEBHOOK_BASE_URL not set or localhost. Skipping subscription setup (Webhooks require public HTTPS).');
       console.log('Use ngrok or similar and update .env if you want to test webhooks locally.');
    }

    console.log('Setup complete. Monitoring for changes...');

  } catch (err) {
    console.error('Fatal startup error:', err);
    process.exit(1);
  }
};

main();
