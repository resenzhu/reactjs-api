import {config as loadEnv} from 'dotenv';

if (process.env.NODE_ENV !== 'production')
{
  loadEnv();
}

type MailjetConfig =
{
  api:
  {
    key: string,
    secret: string
  },
  request:
  {
    Messages:
    [
      {
        From:
        {
          Name: string,
          Email: string
        },
        To:
        [
          {
            Name: string,
            Email: string
          }
        ]
      }
    ]
  }
};

const mailjetConfig: MailjetConfig =
{
  api:
  {
    key: process.env.MAILJET_KEY_API,
    secret: process.env.MAILJET_KEY_SECRET
  },
  request:
  {
    Messages:
    [
      {
        From:
        {
          Name: process.env.MAILJET_USER_NAME,
          Email: process.env.MAILJET_USER_EMAIL
        },
        To:
        [
          {
            Name: process.env.MAILJET_USER_NAME,
            Email: process.env.MAILJET_USER_EMAIL
          }
        ]
      }
    ]
  }
};

export default mailjetConfig;
