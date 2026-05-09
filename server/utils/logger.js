const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = levels[process.env.LOG_LEVEL] ?? levels.info;

function formatMeta(meta) {
  if (!meta || Object.keys(meta).length === 0) return '';
  return Object.entries(meta).map(([k, v]) => {
    if (v instanceof Error) return `${k}: ${v.message}\n${v.stack}`;
    if (typeof v === 'object') return `${k}: ${JSON.stringify(v)}`;
    return `${k}: ${v}`;
  }).join(' ');
}

function formatMessage(level, message, meta) {
  const timestamp = new Date().toISOString();
  const metaStr = formatMeta(meta);

  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify({ timestamp, level, message, ...meta });
  }

  const colors = { error: '\x1b[31m', warn: '\x1b[33m', info: '\x1b[36m', debug: '\x1b[90m' };
  const color = colors[level] || '\x1b[0m';
  const reset = '\x1b[0m';

  let log = `${color}[${timestamp}] ${level.toUpperCase()}: ${message}${reset}`;
  if (metaStr) log += `\n  ${metaStr}`;
  return log;
}

function shouldLog(level) {
  return levels[level] <= currentLevel;
}

const logger = {
  error(message, meta) {
    if (shouldLog('error')) console.error(formatMessage('error', message, meta));
  },
  warn(message, meta) {
    if (shouldLog('warn')) console.warn(formatMessage('warn', message, meta));
  },
  info(message, meta) {
    if (shouldLog('info')) console.log(formatMessage('info', message, meta));
  },
  debug(message, meta) {
    if (shouldLog('debug')) console.log(formatMessage('debug', message, meta));
  }
};

export default logger;