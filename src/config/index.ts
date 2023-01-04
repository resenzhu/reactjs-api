import cipherConfig from '@config/cipher';
import jwtConfig from '@config/jwt';
import mailjetConfig from '@config/mailjet';
import serverConfig from '@config/server';
import winstonConfig from '@config/winston';

const config =
{
  cipher: cipherConfig,
  jwt: jwtConfig,
  mailjet: mailjetConfig,
  server: serverConfig,
  winston: winstonConfig
};

export default config;
