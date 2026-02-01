import { listEvents } from './calendar';
import { pool } from './db';
import { generateDiffLogs } from './diff';
import { calendar_v3 } from 'googleapis';

export const syncCalendar = async (calendarId: string) => {
  const client = await pool.connect();
  try {
    console.log(`Starting sync for ${calendarId}...`);

    // 1. Get current sync token
    const res = await client.query('SELECT sync_token FROM calendar_sync_state WHERE calendar_id = $1', [calendarId]);
    const currentSyncToken = res.rows.length > 0 ? res.rows[0].sync_token : undefined;

    // 2. Fetch events from Google
    const { events, nextSyncToken } = await listEvents(calendarId, currentSyncToken);
    
    if (events.length === 0) {
      console.log(`No changes found for ${calendarId}.`);
       // Even if no events, we should update sync token if it changed
       if (nextSyncToken && nextSyncToken !== currentSyncToken) {
          await client.query(
            'INSERT INTO calendar_sync_state (calendar_id, sync_token, last_synced_at) VALUES ($1, $2, NOW()) ON CONFLICT (calendar_id) DO UPDATE SET sync_token = $2, last_synced_at = NOW()',
            [calendarId, nextSyncToken]
          );
       }
      return;
    }

    console.log(`Processing ${events.length} event updates for ${calendarId}...`);

    // 3. Process events
    for (const event of events) {
      const eventId = event.id;
      if (!eventId) continue;

      if (event.status === 'cancelled') {
        // Handle Deletion
        const oldRes = await client.query('SELECT event_data FROM calendar_events_snapshot WHERE calendar_id = $1 AND event_id = $2', [calendarId, eventId]);
        if (oldRes.rows.length > 0) {
          const oldEvent = oldRes.rows[0].event_data;
          console.log(`[LOG] Event Deleted: ${oldEvent.summary || '(No Title)'} (ID: ${eventId})`);
          await client.query('DELETE FROM calendar_events_snapshot WHERE calendar_id = $1 AND event_id = $2', [calendarId, eventId]);
        } else {
           console.log(`[LOG] Event Deleted (but was not in cache): ID ${eventId}`);
        }
      } else {
        // Handle Add or Update
        const oldRes = await client.query('SELECT event_data FROM calendar_events_snapshot WHERE calendar_id = $1 AND event_id = $2', [calendarId, eventId]);
        
        if (oldRes.rows.length === 0) {
          // New Event
          console.log(`[LOG] New Event Added: ${event.summary || '(No Title)'} at ${event.start?.dateTime || event.start?.date}`);
        } else {
          // Update
          const oldEvent = oldRes.rows[0].event_data;
          const changes = generateDiffLogs(oldEvent, event);
          if (changes.length > 0) {
            console.log(`[LOG] Event Updated: "${event.summary || '(No Title)'}"`);
            changes.forEach(change => console.log(`      -> ${change}`));
          }
        }

        // Upsert snapshot
        await client.query(
          `INSERT INTO calendar_events_snapshot (calendar_id, event_id, event_data, updated_at) 
           VALUES ($1, $2, $3, NOW()) 
           ON CONFLICT (calendar_id, event_id) 
           DO UPDATE SET event_data = $3, updated_at = NOW()`,
          [calendarId, eventId, event]
        );
      }
    }

    // 4. Update Sync Token
    if (nextSyncToken) {
      await client.query(
        'INSERT INTO calendar_sync_state (calendar_id, sync_token, last_synced_at) VALUES ($1, $2, NOW()) ON CONFLICT (calendar_id) DO UPDATE SET sync_token = $2, last_synced_at = NOW()',
        [calendarId, nextSyncToken]
      );
    }

    console.log(`Sync complete for ${calendarId}.`);

  } catch (err) {
    console.error(`Error syncing calendar ${calendarId}:`, err);
  } finally {
    client.release();
  }
};
