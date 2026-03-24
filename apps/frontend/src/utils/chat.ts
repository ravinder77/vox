export function formatNow() {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatConversationListTime(value: string) {
  const normalizedValue = (value || '').trim();
  if (!normalizedValue) {
    return '';
  }

  if (normalizedValue.toLowerCase() === 'now') {
    return 'now';
  }

  const parsed = new Date(normalizedValue);
  if (!Number.isNaN(parsed.getTime())) {
    const diffMs = Date.now() - parsed.getTime();
    if (diffMs >= 0 && diffMs < 60_000) {
      return 'now';
    }

    return parsed.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return normalizedValue;
}

export function getStatusLabel(status) {
  if (status === 'online') {
    return 'Online now';
  }
  if (status === 'away') {
    return 'Away';
  }
  return 'Offline';
}

export function getStatusClass(status) {
  if (status === 'online') {
    return 'online';
  }
  if (status === 'away') {
    return 'away';
  }
  return 'offline';
}

export function getLocalTimeLabel() {
  const time = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Los_Angeles',
  });

  return `${time} PST`;
}
