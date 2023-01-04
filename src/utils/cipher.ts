import {createCipheriv, createDecipheriv} from 'crypto';
import config from '@config/index';

const {algorithm, key, iv} = config.cipher;

export const encrypt = (text: string): string =>
{
  const cipher = createCipheriv(algorithm, Buffer.from(key), iv);

  const encrypted = `${cipher.update(text, 'utf8', 'hex')}${cipher.final('hex')}`;

  return encrypted;
};

export const decrypt = (text: string): string =>
{
  const dechipher = createDecipheriv(algorithm, Buffer.from(key), iv);

  const decrypted = `${dechipher.update(text, 'hex', 'utf8')}${dechipher.final('utf8')}`;

  return decrypted;
};
