import { listEvents } from './calendar';
import { pool } from './db';
import { generateDiffLogs } from './diff';
import { calendar_v3 } from 'googleapis';
import { sendDiscordMessage, DiscordEmbed } from './discord';
import { getEventColor, getDiscordColor, DEFAULT_COLOR } from './colors';

export const syncCalendar = async (calendarId: string) => {
  const client = await pool.connect();
  try {
    console.log(`Starting sync for ${calendarId}...`);

    // 1. Get current sync token
    const res = await client.query('SELECT sync_token FROM calendar_sync_state WHERE calendar_id = $1', [calendarId]);
    const currentSyncToken = res.rows.length > 0 ? res.rows[0].sync_token : undefined;
    const isInitialSync = !currentSyncToken;

    // 2. Fetch events from Google
    const { events, nextSyncToken } = await listEvents(calendarId, currentSyncToken);
    
    if (events.length === 0) {
      console.log(`No changes found for ${calendarId}.`);
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
          
          if (!isInitialSync) {
            const embed: DiscordEmbed = {
              title: '🗑️ Event Deleted',
              description: `**${oldEvent.summary || '(No Title)'}**`,
              color: 0xff0000, // Red
              fields: [
                 { name: 'Time', value: oldEvent.start?.dateTime || oldEvent.start?.date || 'Unknown', inline: true },
                 { name: 'Location', value: oldEvent.location || 'None', inline: true }
              ],
              timestamp: new Date().toISOString()
            };
            await sendDiscordMessage(undefined, embed);
          }
          await client.query('DELETE FROM calendar_events_snapshot WHERE calendar_id = $1 AND event_id = $2', [calendarId, eventId]);
        }
      } else {
        // Handle Add or Update
        const oldRes = await client.query('SELECT event_data FROM calendar_events_snapshot WHERE calendar_id = $1 AND event_id = $2', [calendarId, eventId]);
        
        const colorInfo = getEventColor(event.colorId);
        
        if (oldRes.rows.length === 0) {
          // New Event
          const time = event.start?.dateTime || event.start?.date || 'Unknown Time';
          console.log(`[LOG] New Event Added: ${event.summary || '(No Title)'} at ${time}`);
          
          if (!isInitialSync) {
             const embed: DiscordEmbed = {
              title: '🆕 New Event Added',
              description: `**${event.summary || '(No Title)'}**\n\n${event.description || ''}`,
              color: getDiscordColor(colorInfo.hex), // Use Event Color or Default
              fields: [
                 { name: 'Time', value: time, inline: true },
                 { name: 'Location', value: event.location || 'None', inline: true },
                 { name: 'Color', value: colorInfo.name, inline: true }
              ],
              url: event.htmlLink || undefined,
              timestamp: new Date().toISOString()
            };
            await sendDiscordMessage(undefined, embed);
          }
        } else {
          // Update
          const oldEvent = oldRes.rows[0].event_data;
          const changes = generateDiffLogs(oldEvent, event);
          if (changes.length > 0) {
            const title = event.summary || '(No Title)';
            console.log(`[LOG] Event Updated: "${title}"`);
            
            if (!isInitialSync) {
               const isColorChange = changes.some(c => c.startsWith('Color changed'));
               const changeFields = changes.map((change: string) => {
                 // Try to split key/value or just put as value
                 return { name: 'Change', value: change, inline: false };
               });

               const embed: DiscordEmbed = {
                  title: '✏️ Event Updated',
                  description: `**${title}**`,
                  color: isColorChange ? getDiscordColor(getEventColor(event.colorId).hex) : 0xffa500, // Orange or New Color
                  fields: changeFields,
                  url: event.htmlLink || undefined,
                  timestamp: new Date().toISOString()
               };
               await sendDiscordMessage(undefined, embed);
            }
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
