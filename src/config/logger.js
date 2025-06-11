import winston, { format } from 'winston';

const isProduction = process.env.NODE_ENV === 'production';

const loggerTransports = [
  new winston.transports.Console({
    level: 'debug',
    format: format.combine(
      format.timestamp(),
      format.colorize(),
      format.simple()
    ),
    handleExceptions: true
  })
];

const morganTransports = [
  new winston.transports.Console({
    level: 'debug',
    format: format.combine(
      format.colorize(),
      format.simple()
    ),
    handleExceptions: true
  })
];

// If not in production, enable file-based logging
if (!isProduction) {
  import('winston-daily-rotate-file').then(async ({ default: DailyRotateFile }) => {
    const fs = await import('fs');
    const path = await import('path');

    const ensureDir = (dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    };

    ensureDir('logs/server');
    ensureDir('logs/requests/daily');

    loggerTransports.push(
      new winston.transports.File({
        filename: 'logs/server/error.log',
        level: 'error',
        handleExceptions: true
      }),
      new winston.transports.File({
        filename: 'logs/server/all.log',
        level: 'info',
        handleExceptions: true
      }),
      new DailyRotateFile({
        maxFiles: '14d',
        level: 'info',
        dirname: 'logs/server/daily',
        datePattern: 'YYYY-MM-DD',
        filename: '%DATE%.log'
      })
    );

    morganTransports.push(
      new winston.transports.File({
        filename: 'logs/requests/all.log',
        level: 'debug',
        handleExceptions: true
      }),
      new DailyRotateFile({
        maxFiles: '14d',
        level: 'info',
        dirname: 'logs/requests/daily',
        datePattern: 'YYYY-MM-DD',
        filename: '%DATE%.log'
      })
    );
  });
}

const logger = winston.createLogger({
  format: format.combine(format.timestamp(), format.simple()),
  transports: loggerTransports
});

const morganLogger = winston.createLogger({
  format: format.combine(format.simple()),
  transports: morganTransports
});

export const logStream = {
  write(message) {
    morganLogger.info(message.toString().trim());
  }
};

export default logger;
