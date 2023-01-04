import {Logform, format, transports} from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

type DailyRotateFileConfig =
{
  dirname: string,
  filename: string,
  datePattern: string,
  utc: boolean,
  maxFiles: string,
  zippedArchive: boolean
};

type WinstonConfig =
{
  format: Logform.Format,
  transports: (transports.ConsoleTransportInstance | DailyRotateFile)[]
};

const dailyRotateFileConfig: DailyRotateFileConfig =
{
  dirname: 'src/logs/winston',
  filename: '%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  utc: true,
  maxFiles: '30d',
  zippedArchive: true
};

const winstonConfig: WinstonConfig =
{
  transports:
  [
    new transports.Console(),
    new DailyRotateFile(dailyRotateFileConfig)
  ],
  format: format.combine(format.timestamp(), format.printf((log): string =>
  {
    const {timestamp, level, message} = log;

    return `${timestamp} | ${level} | ${message}`;
  }))
};

export default winstonConfig;
