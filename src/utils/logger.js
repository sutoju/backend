import winston from 'winston';
import moment from 'moment';

const env = process.env.NODE_ENV || 'development';

function formattedTimestamp() {
  return moment().format();
}

function formattedObject(object) {
  return `\n + ${JSON.stringify(object, undefined, 2)}`;
}

winston.configure({
  transports: [
    new winston.transports.Console({
      name: 'debug-console',
      timestamp: formattedTimestamp,
      prettyPrint: formattedObject,
      colorize: true,
      handleExceptions: true,
      level: env === 'development' ? 'debug' : 'info',
    }),
  ],
});

export const logger = winston;
export const logStream = {
  write: (message) => {
    winston.info(message);
  },
};
