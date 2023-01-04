import {config as loadEnv} from 'dotenv';

if (process.env.NODE_ENV !== 'production')
{
  loadEnv();
}

type CipherConfig =
{
  algorithm: string,
  key: string,
  iv: string
};

const cipherConfig: CipherConfig =
{
  algorithm: 'aes-256-cbc',
  key: process.env.CIPHER_KEY,
  iv: process.env.CIPHER_IV
};

export default cipherConfig;
