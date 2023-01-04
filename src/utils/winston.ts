import config from '@config/index';
import {createLogger} from 'winston';

const winstonConfig = config.winston;

const winston = createLogger(winstonConfig);

const {error, info} = winston;

export {error, info};
