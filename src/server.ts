import {Server} from 'socket.io';
import config from '@config/index';
import {createServer as createHttpServer} from 'http';
import {createServer as createHttpsServer} from 'https';
import {info} from '@utils/winston';
import {initialize} from '@app/index';
import {config as loadEnv} from 'dotenv';

if (process.env.NODE_ENV !== 'production')
{
  loadEnv();
}

const {https: httpsConfig, io: ioConfig, port} = config.server;

const httpServer = process.env.NODE_ENV === 'production' ? createHttpServer() : createHttpsServer(httpsConfig);

const ioServer = new Server(ioConfig);

initialize(ioServer);

ioServer.attach(httpServer);

httpServer.listen(port, (): void =>
{
  info(`server: ${process.env.NODE_ENV} server started on port ${port}`);
});
