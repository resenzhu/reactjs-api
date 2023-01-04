import fs from 'fs';
import {config as loadEnv} from 'dotenv';

if (process.env.NODE_ENV !== 'production')
{
  loadEnv();
}

type Transport = 'websocket' | 'polling';

type ServerConfig =
{
  port: number,
  https:
  {
    cert: Buffer,
    key: Buffer
  },
  io:
  {
    transports: Transport[],
    serveClient: boolean,
    cors:
    {
      origin: string | string[],
      optionsSuccessStatus: number
    },
    allowRequest: (request: any, callback: (...args: any[]) => void) => void // eslint-disable-line
  }
};

const allowRequest = (request: any, callback: (...args: any[]) => void): void => // eslint-disable-line
{
  const validOrigin = request.headers.origin === process.env.SERVER_CLIENT;

  callback(null, validOrigin);
};

const serverConfig: ServerConfig =
{
  port: process.env.PORT,
  https:
  {
    cert: fs.readFileSync('certs/localhost.crt'),
    key: fs.readFileSync('certs/localhost.key')
  },
  io:
  {
    transports: ['websocket', 'polling'],
    serveClient: false,
    cors:
    {
      origin: process.env.SERVER_CLIENT,
      optionsSuccessStatus: 200
    },
    allowRequest: allowRequest
  }
};

export default serverConfig;
