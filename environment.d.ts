declare namespace NodeJS
{
  interface ProcessEnv
  {
    CIPHER_KEY: string,
    CIPHER_IV: string,
    JWT_SECRET_KEY: string,
    MAILJET_KEY_API: string,
    MAILJET_KEY_SECRET: string,
    MAILJET_USER_NAME: string,
    MAILJET_USER_EMAIL: string,
    NODE_ENV: 'development' | 'production',
    PORT: number,
    SERVER_CLIENT: string
  }
}
