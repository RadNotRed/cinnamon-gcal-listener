import { v4 as uuidv4 } from 'uuid';
import { CONFIG } from './config';
import { watchCalendar, stopChannel } from './calendar';
import { pool } from './db';

export const ensureSubscriptions = async () => {
  console.log('Ensuring subscriptions...');
  
  for (const calId of CONFIG.LOGGED_CAL_IDS) {
    if (!calId) continue;
    
    const res = await pool.query('SELECT channel_id, resource_id, expiration FROM calendar_sync_state WHERE calendar_id = $1', [calId]);
    
    let needsRenew = true;
    let oldChannelId = null;
    let oldResourceId = null;

    if (res.rows.length > 0) {
      const { channel_id, resource_id, expiration } = res.rows[0];
      const now = Date.now();
      // Renew if expiring in less than 1 hour or if no channel_id
      if (channel_id && expiration && (parseInt(expiration) - now > 3600000)) {
        needsRenew = false;
        console.log(`Subscription for ${calId} is active (Channel: ${channel_id}).`);
      } else {
        if (channel_id) {
           console.log(`Subscription for ${calId} expiring or invalid. Renewing...`);
           oldChannelId = channel_id;
           oldResourceId = resource_id;
        }
      }
    }

    if (needsRenew) {
      const newChannelId = uuidv4();
      const address = `${CONFIG.WEBHOOK_BASE_URL}/webhook`;
      
      try {
        console.log(`Creating watch channel for ${calId} at ${address}...`);
        const watchRes = await watchCalendar(calId, newChannelId, address);
        
        // Save to DB
        // expiration is in headers usually, or we assume default (1 week usually). 
        // The API returns 'expiration' in the body (long timestamp in string).
        const expiration = watchRes.expiration || (Date.now() + 604800000).toString(); // Default 1 week if missing

        await pool.query(
          `INSERT INTO calendar_sync_state (calendar_id, channel_id, resource_id, expiration) 
           VALUES ($1, $2, $3, $4) 
           ON CONFLICT (calendar_id) 
           DO UPDATE SET channel_id = $2, resource_id = $3, expiration = $4`,
          [calId, newChannelId, watchRes.resourceId, expiration]
        );

        console.log(`Subscribed to ${calId}. Expiration: ${new Date(parseInt(expiration)).toLocaleString()}`);

        // Cleanup old channel if applicable
        if (oldChannelId && oldResourceId) {
          try {
             await stopChannel(oldChannelId, oldResourceId);
             console.log('Stopped old channel.');
          } catch(e) {
             console.warn('Failed to stop old channel (might be already gone):', e);
          }
        }

      } catch (err) {
        console.error(`Failed to subscribe to ${calId}:`, err);
        // Continue to next calendar
      }
    }
  }
};
