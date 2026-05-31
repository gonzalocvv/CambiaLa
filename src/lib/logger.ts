type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogContext = Record<string, unknown>;

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
}

const LOG_LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const minLevel: LogLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_RANK[level] >= LOG_LEVEL_RANK[minLevel];
}

function formatDev(entry: LogEntry): string {
  const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
  return `[${entry.level.toUpperCase()}] ${entry.message}${ctx}`;
}

function emit(entry: LogEntry): void {
  if (!shouldLog(entry.level)) return;

  if (process.env.NODE_ENV === 'production') {
    const line = JSON.stringify(entry);
    if (entry.level === 'error') {
      console.error(line);
    } else if (entry.level === 'warn') {
      console.warn(line);
    } else {
      console.info(line);
    }
  } else {
    const formatted = formatDev(entry);
    if (entry.level === 'error') {
      console.error(formatted);
    } else if (entry.level === 'warn') {
      console.warn(formatted);
    } else if (entry.level === 'debug') {
      console.debug(formatted);
    } else {
      console.info(formatted);
    }
  }
}

function log(level: LogLevel, message: string, context?: LogContext): void {
  emit({ level, message, timestamp: new Date().toISOString(), context });
}

export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext) => log('error', message, context),
};
