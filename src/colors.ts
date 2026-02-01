// Google Calendar Event Colors (Standard IDs)
export const EVENT_COLORS: Record<string, { name: string; hex: string }> = {
  '1': { name: 'Lavender', hex: '#7986cb' },
  '2': { name: 'Sage', hex: '#33b679' },
  '3': { name: 'Grape', hex: '#8e24aa' },
  '4': { name: 'Flamingo', hex: '#e67c73' },
  '5': { name: 'Banana', hex: '#f6bf26' },
  '6': { name: 'Tangerine', hex: '#f4511e' },
  '7': { name: 'Peacock', hex: '#039be5' },
  '8': { name: 'Graphite', hex: '#616161' },
  '9': { name: 'Blueberry', hex: '#3f51b5' },
  '10': { name: 'Basil', hex: '#0b8043' },
  '11': { name: 'Tomato', hex: '#d50000' },
};

export const DEFAULT_COLOR = { name: 'Default', hex: '#039be5' }; // Peacock/Blue as fallback

export const getEventColor = (colorId?: string | null) => {
  if (!colorId) return DEFAULT_COLOR;
  return EVENT_COLORS[colorId] || DEFAULT_COLOR;
};

// Returns integer representation of hex color for Discord
export const getDiscordColor = (hex: string): number => {
  return parseInt(hex.replace('#', ''), 16);
};
