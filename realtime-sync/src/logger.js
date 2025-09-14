import pino from 'pino';
import { CONFIG } from '../config/config.js';

const loggerOptions = {
  level: CONFIG.logging.level,
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => {
      return { level: label };
    }
  },
  serializers: {
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res
  }
};

// Add pretty printing for development
if (CONFIG.logging.pretty) {
  loggerOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  };
}

// Add file transport if configured
if (CONFIG.logging.file) {
  loggerOptions.transport = {
    targets: [
      ...(CONFIG.logging.pretty ? [{
        target: 'pino-pretty',
        level: CONFIG.logging.level,
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      }] : []),
      {
        target: 'pino/file',
        level: CONFIG.logging.level,
        options: {
          destination: CONFIG.logging.file,
          mkdir: true
        }
      }
    ]
  };
}

const baseLogger = pino(loggerOptions);

/**
 * Create a child logger with additional context
 */
export function createLogger(name, context = {}) {
  return baseLogger.child({
    name,
    ...context
  });
}

/**
 * Create request logger middleware for Express
 */
export function createRequestLogger() {
  return pino.logger({
    ...loggerOptions,
    serializers: {
      ...loggerOptions.serializers,
      req: (req) => ({
        method: req.method,
        url: req.url,
        headers: req.headers,
        remoteAddress: req.remoteAddress,
        remotePort: req.remotePort
      }),
      res: (res) => ({
        statusCode: res.statusCode,
        headers: res.headers
      })
    }
  });
}

export default baseLogger;