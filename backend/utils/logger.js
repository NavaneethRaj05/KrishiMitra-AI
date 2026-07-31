import winston from 'winston';

const { combine, timestamp, json, printf, colorize, align } = winston.format;

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    process.env.NODE_ENV === 'production' ? json() : combine(
      colorize(),
      align(),
      printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
    )
  ),
  transports: [
    new winston.transports.Console(),
  ],
});
