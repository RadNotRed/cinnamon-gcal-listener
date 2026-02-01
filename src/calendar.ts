import { google, calendar_v3 } from 'googleapis';
import { CONFIG } from './config';

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: CONFIG.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: CONFIG.GOOGLE_PRIVATE_KEY,
  },
  scopes: SCOPES,
});

export const calendar = google.calendar({ version: 'v3', auth });

/**
 * Lists events from a calendar.
 * If syncToken is provided, it performs an incremental sync.
 */
export const listEvents = async (
  calendarId: string,
  syncToken?: string
): Promise<{ events: calendar_v3.Schema$Event[]; nextSyncToken?: string | null }> => {
  try {
    const params: calendar_v3.Params$Resource$Events$List = {
      calendarId,
      singleEvents: true, // Expand recurring events
      maxResults: 2500,
    };

    if (syncToken) {
      params.syncToken = syncToken;
    }

    let allEvents: calendar_v3.Schema$Event[] = [];
    let pageToken: string | undefined;
    let nextSyncToken: string | null | undefined;

    do {
      if (pageToken) {
        params.pageToken = pageToken;
      }
      
      const res = await calendar.events.list(params);
      const items = res.data.items || [];
      allEvents = allEvents.concat(items);
      
      pageToken = res.data.nextPageToken as string | undefined;
      nextSyncToken = res.data.nextSyncToken;
      
    } while (pageToken);

    return { events: allEvents, nextSyncToken };
    
  } catch (error: any) {
    if (error.code === 410) {
      // Sync token invalid (expired), perform full sync
      console.warn(`Sync token expired for ${calendarId}, clearing and retrying full sync.`);
      return listEvents(calendarId); // Recursive call without syncToken
    }
    throw error;
  }
};

/**
 * Sets up a push notification channel for a calendar.
 */
export const watchCalendar = async (
  calendarId: string,
  channelId: string,
  address: string
) => {
  const res = await calendar.events.watch({
    calendarId,
    requestBody: {
      id: channelId,
      type: 'web_hook',
      address: address,
      // expiration: ... // Optional, defaults to max allowed (usually 1 week or something)
    },
  });
  return res.data;
};

/**
 * Stops a push notification channel.
 */
export const stopChannel = async (id: string, resourceId: string) => {
  await calendar.channels.stop({
    requestBody: {
      id,
      resourceId,
    },
  });
};
