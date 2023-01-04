import Mailjet from 'node-mailjet';
import config from '@config/index';

type Mail =
{
  name: string,
  email: string,
  message: string
};

export const sendMail = (mail: Mail): Promise<void> =>
(
  new Promise((resolve, reject): void =>
  {
    const {api: apiConfig, request: requestConfig} = config.mailjet;

    const mailjet = Mailjet.apiConnect(apiConfig.key, apiConfig.secret);

    const subject = `Message from ${mail.name} <${mail.email}>`;

    const text = mail.message.replaceAll('\n', '\\n');

    const html = mail.message.replaceAll('\n', '<br />');

    const completedRequestConfig: object =
    {
      ...requestConfig,
      Messages:
      [
        {
          ...requestConfig.Messages[0],
          Subject: subject,
          TextPart: text,
          HTMLPart: html
        }
      ]
    };

    mailjet.post('send',
    {
      version: 'v3.1'
    })
    .request(completedRequestConfig).then((): void =>
    {
      resolve();
    })
    .catch((err): void =>
    {
      reject(err.ErrorMessage);
    });
  })
);
