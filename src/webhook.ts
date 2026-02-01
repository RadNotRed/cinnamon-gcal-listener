import { Request, Response } from 'express';
import { pool } from './db';
import { syncCalendar } from './sync';

export const handleWebhook = async (req: Request, res: Response) => {
  // Always return 200 OK quickly to Google? 
  // Google recommends responding first, but if we do async work, it's fine as long as we don't timeout.
  // Express handles parsing.
  
  const channelId = req.header('x-goog-channel-id');
  const resourceState = req.header('x-goog-resource-state');
  const resourceId = req.header('x-goog-resource-id');

  console.log(`Received Webhook: Channel=${channelId}, State=${resourceState}`);

  if (!channelId) {
    res.status(400).send('Missing headers');
    return;
  }

  if (resourceState === 'sync') {
    console.log(`Channel ${channelId} verified/synced.`);
    res.status(200).send('OK');
    return;
  }

  if (resourceState === 'exists') {
    // Lookup calendar for this channel
    try {
      const dbRes = await pool.query('SELECT calendar_id FROM calendar_sync_state WHERE channel_id = $1', [channelId]);
      if (dbRes.rows.length === 0) {
        console.warn(`Unknown channel ID: ${channelId}`);
        res.status(404).send('Unknown Channel'); // Or 200 to stop it from retrying if we don't care? 
        // If we 404, Google might stop sending? 
        // Better to 200 so they stop retrying this specific delivery.
        return;
      }

      const calendarId = dbRes.rows[0].calendar_id;
      
      // Trigger sync
      // We can await it, or fire and forget. Awaiting is safer to ensure we handle it before ack, 
      // but if it takes too long Google might timeout. 
      await syncCalendar(calendarId);
      
      res.status(200).send('OK');
    } catch (err) {
      console.error('Error handling webhook:', err);
      res.status(500).send('Internal Error');
    }
    return;
  }
  
  // Other states: not_exists (resource deleted?)
  res.status(200).send('Ignored');
};
