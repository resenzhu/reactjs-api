import {main, theLounge} from '@routers/index';
import type {Server} from 'socket.io';

export const initialize = (server: Server): void =>
{
  main(server);
  theLounge(server);
};
