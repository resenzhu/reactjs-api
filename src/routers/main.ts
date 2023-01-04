import type {Server, Socket} from 'socket.io';
import {error, info} from '@utils/winston';
import {failed, success} from '@utils/response';
import {encrypt} from '@utils/cipher';
import joi from 'joi';
import {sendMail} from '@utils/mailjet';

type SrvContactForm =
{
  name: string,
  email: string,
  message: string
};

type ReqSubmitContactForm =
{
  name: string,
  email: string,
  message: string,
  honeypot: string
};

type ResError =
{
  status: number,
  subStatus: number,
  message: string
};

const mainRouter = (server: Server): void =>
{
  const main = server.of('/main');

  main.on('connection', (socket: Socket): void =>
  {
    info(`${socket.id}: connected`);

    socket.on('submit-contact-form', (request): boolean =>
    {
      info(`${socket.id}: submit contact form`);

      const submitContactFormSchema = joi.object(
      {
        name: joi.string().min(2).max(120).pattern(/^[a-zA-Z\s]*$/u).required().messages(
        {
          'string.base': '400|101|\'name\' must be a string.',
          'string.empty': '400|102|\'name\' must not be empty.',
          'string.min': '400|103|\'name\' length must be between 2 and 120 characters.',
          'string.max': '400|104|\'name\' length must be between 2 and 120 characters.',
          'string.pattern.base': '400|105|\'name\' must contain only letters and spaces.',
          'any.required': '400|106|\'name\' is required.'
        }),
        email: joi.string().min(3).max(320).email().required().messages(
        {
          'string.base': '400|201|\'email\' must be a string.',
          'string.empty': '400|202|\'email\' must not be empty.',
          'string.min': '400|203|\'email\' length must be between 3 and 320 characters.',
          'string.max': '400|204|\'email\' length must be between 3 and 320 characters.',
          'string.email': '400|205|\'email\' must be a valid email address.',
          'any.required': '400|206|\'email\' is required.'
        }),
        message: joi.string().min(15).max(2000).required().messages(
        {
          'string.base': '400|301|\'message\' must be a string.',
          'string.empty': '400|302|\'message\' must not be empty.',
          'string.min': '400|303|\'message\' length must be between 15 and 2000 characters.',
          'string.max': '400|304|\'message\' length must be between 15 and 2000 characters.',
          'any.required': '400|305|\'message\' is required.'
        }),
        honeypot: joi.string().allow('').length(0).required().messages(
        {
          'string.base': '400|401|\'honeypot\' must be a string.',
          'string.length': '403|402|\'honeypot\' must be empty.',
          'any.required': '400|403|\'honeypot\' is required.'
        })
      });

      const {value: submitContactFormValue, error: submitContactFormError} = submitContactFormSchema.validate(request);

      if (submitContactFormError)
      {
        error(`${socket.id}: failed to validate request. payload => ${encrypt(JSON.stringify(submitContactFormValue))}`);

        const errorStatus: number = parseInt(submitContactFormError.message.split('|')[0] ?? '400');

        const errorSubStatus: number = parseInt(submitContactFormError.message.split('|')[1] ?? '999');

        const errorMessage: string = submitContactFormError.message.split('|')[2]?.toString() ?? 'payload is invalid.';

        const resError: ResError =
        {
          status: errorStatus,
          subStatus: errorSubStatus,
          message: errorMessage
        };

        info(`${socket.id}: submit contact form failed. reason => ${errorMessage}`);

        return socket.emit('submit-contact-form-response', failed(resError));
      }

      const reqSubmitContactForm = submitContactFormValue as ReqSubmitContactForm;

      const contactForm: SrvContactForm =
      {
        name: reqSubmitContactForm.name,
        email: reqSubmitContactForm.email,
        message: reqSubmitContactForm.message
      };

      sendMail(contactForm).then((): void =>
      {
        info(`${socket.id}: submit contact form success`);

        socket.emit('submit-contact-form-response', success());
      })
      .catch((err): void =>
      {
        error(`${socket.id}: failed to send email. error => ${encrypt(err)}`);

        const errorStatus: number = 503;

        const errorSubStatus: number = 0;

        const errorMessage: string = 'an error occured while sending email.';

        const resError: ResError =
        {
          status: errorStatus,
          subStatus: errorSubStatus,
          message: errorMessage
        };

        info(`${socket.id}: submit contact form failed. reason => ${errorMessage}`);

        socket.emit('submit-contact-form-response', failed(resError));
      });

      return true;
    });

    socket.on('disconnect', (): void =>
    {
      info(`${socket.id}: disconnected`);
    });
  });
};

export default mainRouter;
