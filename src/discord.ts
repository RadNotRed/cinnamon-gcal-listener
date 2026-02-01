import { CONFIG } from './config';

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  timestamp?: string;
  footer?: { text: string; icon_url?: string };
  thumbnail?: { url: string };
  image?: { url: string };
  author?: { name: string; url?: string; icon_url?: string };
  fields?: { name: string; value: string; inline?: boolean }[];
}

export const sendDiscordMessage = async (content?: string, embed?: DiscordEmbed) => {
  if (!CONFIG.DISCORD_WEBHOOK_URL) {
    return;
  }

  const body: any = {};
  if (content) body.content = content;
  if (embed) body.embeds = [embed];

  try {
    const res = await fetch(CONFIG.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error(`Failed to send Discord message: ${res.status} ${res.statusText}`);
    }
  } catch (error) {
    console.error('Error sending Discord message:', error);
  }
};
