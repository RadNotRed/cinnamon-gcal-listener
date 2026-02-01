import { calendar_v3 } from 'googleapis';
import { getEventColor } from './colors';

type Event = calendar_v3.Schema$Event;

export const generateDiffLogs = (oldEvent: Event, newEvent: Event): string[] => {
  const changes: string[] = [];

  // Summary
  if (oldEvent.summary !== newEvent.summary) {
    changes.push(`Summary changed from "${oldEvent.summary || '(empty)'}" to "${newEvent.summary || '(empty)'}"`);
  }

  // Description
  if ((oldEvent.description || '').trim() !== (newEvent.description || '').trim()) {
     // Description can be long, maybe just note it changed
     changes.push(`Description updated`);
  }

  // Location
  if (oldEvent.location !== newEvent.location) {
    changes.push(`Location changed from "${oldEvent.location || '(empty)'}" to "${newEvent.location || '(empty)'}"`);
  }

  // Time
  const oldStart = oldEvent.start?.dateTime || oldEvent.start?.date;
  const newStart = newEvent.start?.dateTime || newEvent.start?.date;
  const oldEnd = oldEvent.end?.dateTime || oldEvent.end?.date;
  const newEnd = newEvent.end?.dateTime || newEvent.end?.date;

  if (oldStart !== newStart || oldEnd !== newEnd) {
     changes.push(`Time moved: ${formatTime(oldStart, oldEnd)} -> ${formatTime(newStart, newEnd)}`);
  }

  // Color (colorId)
  if (oldEvent.colorId !== newEvent.colorId) {
    const oldColor = getEventColor(oldEvent.colorId);
    const newColor = getEventColor(newEvent.colorId);
    changes.push(`Color changed from ${oldColor.name} to ${newColor.name}`);
  }

  return changes;
};

const formatTime = (start?: string | null, end?: string | null) => {
  if (!start && !end) return 'Unknown';
  if (!start && end) return `[? to ${end}]`; // Should ideally not happen for valid events
  if (start && !end) return `[${start} to ?]`;
  return `[${start} to ${end}]`;
};
