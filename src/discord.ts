import { CONFIG } from './config';

export const sendDiscordMessage = async (content: string) => {
  if (!CONFIG.DISCORD_WEBHOOK_URL) {
    // If no webhook configured, just ignore
    return;
  }

  try {
    const res = await fetch(CONFIG.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    if (!res.ok) {
      console.error(`Failed to send Discord message: ${res.status} ${res.statusText}`);
    }
  } catch (error) {
    console.error('Error sending Discord message:', error);
  }
};
