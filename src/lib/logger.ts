type LogFields = Record<string, unknown>

function write(level: 'info' | 'error', event: string, fields: LogFields = {}) {
  const payload = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...fields
  }

  const line = JSON.stringify(payload)
  if (level === 'error') {
    console.error(line)
  } else {
    console.log(line)
  }
}

export function logInfo(event: string, fields: LogFields = {}) {
  write('info', event, fields)
}

export function logError(event: string, fields: LogFields = {}) {
  write('error', event, fields)
}
