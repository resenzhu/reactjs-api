import type {Server, Socket} from 'socket.io';
import {animals, colors, uniqueNamesGenerator} from 'unique-names-generator';
import {error, info} from '@utils/winston';
import {failed, success} from '@utils/response';
import {DateTime} from 'luxon';
import config from '@config/index';
import {encrypt} from '@utils/cipher';
import joi from 'joi';
import jwt from 'jsonwebtoken';
import {nanoid} from 'nanoid';

type SrvToken =
{
  id: string
};

type SrvUser =
{
  id: string,
  name: string,
  status: 'online' | 'away' | 'reconnect' | 'offline',
  socket: string | null,
  createdDate: string,
  modifiedDate: string
};

type ResUser =
{
  id: string,
  name: string,
  status: 'online' | 'away' | 'reconnect' | 'offline'
};

type SrvChat =
{
  id: string,
  userId: string,
  message: string,
  timestamp: string
};

type ResChat =
{
  id: string,
  userId: string,
  message: string,
  timestamp: string
};

type SrvInfo =
{
  id: string,
  userId: string
  activity: 'join' | 'leave',
  timestamp: string
};

type ResInfo =
{
  id: string,
  userId: string
  activity: 'join' | 'leave',
  timestamp: string
};

type SrvMessage = SrvChat | SrvInfo;

type ResMessage = ResChat | ResInfo;

type ReqVerifyToken =
{
  token: string
};

type ResVerifyToken =
{
  token: string
};

type ReqJoinConversation =
{
  token: string
};

type ReqGetUsers =
{
  token: string
};

type ResGetUsers =
{
  users: ResUser[]
};

type ReqGetMessages =
{
  token: string
};

type ResGetMessages =
{
  messages: ResMessage[]
};

type ReqSendMessage =
{
  token: string,
  tempChat:
  {
    id: string,
    message: string
  }
};

type ResSendMessage =
{
  tempChatId: string,
  sentChat: ResChat
};

type ReqUpdateUser =
{
  token: string,
  user:
  {
    name: string,
    status: 'online' | 'away'
  }
};

type ResUpdateUser =
{
  user: ResUser
};

type ResUpdateChat =
{
  chat: ResChat
};

type ResUpdateInfo =
{
  info: ResInfo
};

type ResError =
{
  status: number,
  subStatus: number,
  message: string
};

const theLoungeRouter = (server: Server): void =>
{
  const room: string = 'theLounge';

  const theLounge = server.of('/the-lounge');

  let users: SrvUser[] = [];

  let messages: SrvMessage[] = [];

  theLounge.on('connection', (socket: Socket): void =>
  {
    info(`${socket.id}: connected`);

    socket.on('verify-token', (request): boolean =>
    {
      info(`${socket.id}: verify token`);

      const verifyTokenSchema = joi.object(
      {
        token: joi.string().allow(null).required().messages(
        {
          'string.base': '400|101|\'token\' must be a string.',
          'string.empty': '400|102|\'token\' must not be empty.',
          'any.required': '400|103|\'token\' is required.'
        })
      });

      const {value: verifyTokenValue, error: verifyTokenError} = verifyTokenSchema.validate(request);

      if (verifyTokenError)
      {
        error(`${socket.id}: failed to validate request. payload => ${encrypt(JSON.stringify(verifyTokenValue))}`);

        const errorStatus: number = parseInt(verifyTokenError.message.split('|')[0] ?? '400');

        const errorSubStatus: number = parseInt(verifyTokenError.message.split('|')[1] ?? '999');

        const errorMessage: string = verifyTokenError.message.split('|')[2]?.toString() ?? 'payload is invalid.';

        const resError: ResError =
        {
          status: errorStatus,
          subStatus: errorSubStatus,
          message: errorMessage
        };

        info(`${socket.id}: verify token failed. reason => ${errorMessage}`);

        return socket.emit('verify-token-response', failed(resError));
      }

      const reqVerifyToken = verifyTokenValue as ReqVerifyToken;

      const {jwt: jwtConfig} = config;

      let clientToken: string = '';

      try
      {
        const payload = jwt.verify(reqVerifyToken.token, process.env.JWT_SECRET_KEY) as SrvToken;

        const {id: userId} = payload;

        const newToken: SrvToken =
        {
          id: userId
        };

        clientToken = jwt.sign(newToken, process.env.JWT_SECRET_KEY, jwtConfig);
      }
      catch
      {
        const newToken: SrvToken =
        {
          id: nanoid()
        };

        clientToken = jwt.sign(newToken, process.env.JWT_SECRET_KEY, jwtConfig);
      }

      const resVerifyToken: ResVerifyToken =
      {
        token: clientToken
      };

      info(`${socket.id}: verify token success`);

      return socket.emit('verify-token-response', success(resVerifyToken));
    });

    socket.on('join-conversation', (request): boolean =>
    {
      info(`${socket.id}: join conversation`);

      const joinConversationSchema = joi.object(
      {
        token: joi.string().required().messages(
        {
          'string.base': '400|101|\'token\' must be a string.',
          'string.empty': '400|102|\'token\' must not be empty.',
          'any.required': '400|103|\'token\' is required.'
        })
      });

      const {value: joinConversationValue, error: joinConversationError} = joinConversationSchema.validate(request);

      if (joinConversationError)
      {
        error(`${socket.id}: failed to validate request. payload => ${encrypt(JSON.stringify(joinConversationValue))}`);

        const errorStatus: number = parseInt(joinConversationError.message.split('|')[0] ?? '400');

        const errorSubStatus: number = parseInt(joinConversationError.message.split('|')[1] ?? '999');

        const errorMessage: string = joinConversationError.message.split('|')[2]?.toString() ?? 'payload is invalid.';

        const resError: ResError =
        {
          status: errorStatus,
          subStatus: errorSubStatus,
          message: errorMessage
        };

        info(`${socket.id}: join conversation failed. reason => ${errorMessage}`);

        return socket.emit('join-conversation-response', failed(resError));
      }

      const reqJoinConversation = joinConversationValue as ReqJoinConversation;

      try
      {
        const payload = jwt.verify(reqJoinConversation.token, process.env.JWT_SECRET_KEY) as SrvToken;

        const {id: userId} = payload;

        socket.join(room);

        if (users.some((existingUser): boolean => existingUser.id === userId))
        {
          users = users.map((existingUser): SrvUser =>
          {
            if (existingUser.id === userId)
            {
              const updatedUser: SrvUser =
              {
                ...existingUser,
                status: 'online',
                socket: socket.id,
                modifiedDate: DateTime.utc().toISO()
              };

              const updatedClientUser: ResUser =
              {
                id: updatedUser.id,
                name: updatedUser.name,
                status: updatedUser.status
              };

              const resUpdateUser: ResUpdateUser =
              {
                user: updatedClientUser
              };

              socket.broadcast.to(room).emit('update-user-response', success(resUpdateUser));

              return updatedUser;
            }

            return existingUser;
          });
        }
        else
        {
          const userName = uniqueNamesGenerator(
          {
            dictionaries: [colors, animals],
            length: 2,
            style: 'capital',
            separator: ' '
          });

          const newUser: SrvUser =
          {
            id: userId,
            name: userName,
            status: 'online',
            socket: socket.id,
            createdDate: DateTime.utc().toISO(),
            modifiedDate: DateTime.utc().toISO()
          };

          const newClientUser: ResUser =
          {
            id: newUser.id,
            name: newUser.name,
            status: newUser.status
          };

          const newInfo: SrvInfo =
          {
            id: nanoid(),
            userId: newUser.id,
            activity: 'join',
            timestamp: DateTime.utc().toISO()
          };

          const newClientInfo: ResInfo =
          {
            id: newInfo.id,
            userId: newInfo.userId,
            activity: newInfo.activity,
            timestamp: newInfo.timestamp
          };

          users =
          [
            ...users,
            newUser
          ];

          messages =
          [
            ...messages,
            newInfo
          ];

          const resUpdateUser: ResUpdateUser =
          {
            user: newClientUser
          };

          const resUpdateInfo: ResUpdateInfo =
          {
            info: newClientInfo
          };

          socket.broadcast.to(room).emit('update-user-response', success(resUpdateUser));

          socket.broadcast.to(room).emit('update-info-response', success(resUpdateInfo));
        }

        info(`${socket.id}: join conversation success`);

        return socket.emit('join-conversation-response', success());
      }
      catch
      {
        error(`${socket.id}: failed to verify token. token => ${encrypt(reqJoinConversation.token)}`);

        const errorStatus: number = 403;

        const errorSubStatus: number = 0;

        const errorMessage: string = 'token is invalid.';

        const resError: ResError =
        {
          status: errorStatus,
          subStatus: errorSubStatus,
          message: errorMessage
        };

        info(`${socket.id}: join conversation failed. reason => ${errorMessage}`);

        return socket.emit('join-conversation-response', failed(resError));
      }
    });

    socket.on('get-users', (request): boolean =>
    {
      info(`${socket.id}: get users`);

      const getUsersSchema = joi.object(
      {
        token: joi.string().required().messages(
        {
          'string.base': '400|101|\'token\' must be a string.',
          'string.empty': '400|102|\'token\' must not be empty.',
          'any.required': '400|103|\'token\' is required.'
        })
      });

      const {value: getUsersValue, error: getUsersError} = getUsersSchema.validate(request);

      if (getUsersError)
      {
        error(`${socket.id}: failed to validate request. payload => ${encrypt(JSON.stringify(getUsersValue))}`);

        const errorStatus: number = parseInt(getUsersError.message.split('|')[0] ?? '400');

        const errorSubStatus: number = parseInt(getUsersError.message.split('|')[1] ?? '999');

        const errorMessage: string = getUsersError.message.split('|')[2]?.toString() ?? 'payload is invalid.';

        const resError: ResError =
        {
          status: errorStatus,
          subStatus: errorSubStatus,
          message: errorMessage
        };

        info(`${socket.id}: get users failed. reason => ${errorMessage}`);

        return socket.emit('get-users-response', failed(resError));
      }

      const reqGetUsers = getUsersValue as ReqGetUsers;

      try
      {
        jwt.verify(reqGetUsers.token, process.env.JWT_SECRET_KEY) as SrvToken;

        const clientUsers = users.map((existingUser): ResUser =>
        {
          const clientUser: ResUser =
          {
            id: existingUser.id,
            name: existingUser.name,
            status: existingUser.status
          };

          return clientUser;
        });

        const resGetUsers: ResGetUsers =
        {
          users: clientUsers
        };

        info(`${socket.id}: get users success`);

        return socket.emit('get-users-response', success(resGetUsers));
      }
      catch
      {
        error(`${socket.id}: failed to verify token. token => ${encrypt(reqGetUsers.token)}`);

        const errorStatus: number = 403;

        const errorSubStatus: number = 0;

        const errorMessage: string = 'token is invalid.';

        const resError: ResError =
        {
          status: errorStatus,
          subStatus: errorSubStatus,
          message: errorMessage
        };

        info(`${socket.id}: get users failed. reason => ${errorMessage}`);

        return socket.emit('get-users-response', failed(resError));
      }
    });

    socket.on('get-messages', (request): boolean =>
    {
      info(`${socket.id}: get messages`);

      const getMessagesSchema = joi.object(
      {
        token: joi.string().required().messages(
        {
          'string.base': '400|101|\'token\' must be a string.',
          'string.empty': '400|102|\'token\' must not be empty.',
          'any.required': '400|103|\'token\' is required.'
        })
      });

      const {value: getMessagesValue, error: getMessagesError} = getMessagesSchema.validate(request);

      if (getMessagesError)
      {
        error(`${socket.id}: failed to validate request. payload => ${encrypt(JSON.stringify(getMessagesValue))}`);

        const errorStatus: number = parseInt(getMessagesError.message.split('|')[0] ?? '400');

        const errorSubStatus: number = parseInt(getMessagesError.message.split('|')[1] ?? '999');

        const errorMessage: string = getMessagesError.message.split('|')[2]?.toString() ?? 'payload is invalid.';

        const resError: ResError =
        {
          status: errorStatus,
          subStatus: errorSubStatus,
          message: errorMessage
        };

        info(`${socket.id}: get messages failed. reason => ${errorMessage}`);

        return socket.emit('get-messages-response', failed(resError));
      }

      const reqGetMessages = getMessagesValue as ReqGetMessages;

      try
      {
        const payload = jwt.verify(reqGetMessages.token, process.env.JWT_SECRET_KEY) as SrvToken;

        const {id: userId} = payload;

        const requestingUser = users.find((existingUser): boolean => existingUser.id === userId);

        const latestMessages = requestingUser ? messages.map((existingMessage): ResMessage =>
        {
          const chatMsg = existingMessage as SrvChat;
          const infoMsg = existingMessage as SrvInfo;

          if (chatMsg.message)
          {
            const clientChat: ResChat =
            {
              id: chatMsg.id,
              userId: chatMsg.userId,
              message: chatMsg.message,
              timestamp: chatMsg.timestamp
            };

            return clientChat;
          }

          const clientInfo: ResInfo =
          {
            id: infoMsg.id,
            userId: infoMsg.userId,
            activity: infoMsg.activity,
            timestamp: infoMsg.timestamp
          };

          return clientInfo;
        })
        .filter((clientMessage): boolean => DateTime.fromISO(clientMessage.timestamp).toMillis() >= DateTime.fromISO(requestingUser.createdDate).toMillis()) : [];

        const resGetMessages: ResGetMessages =
        {
          messages: latestMessages
        };

        info(`${socket.id}: get messages success`);

        return socket.emit('get-messages-response', success(resGetMessages));
      }
      catch
      {
        error(`${socket.id}: failed to verify token. token => ${encrypt(getMessagesValue.token)}`);

        const errorStatus: number = 403;

        const errorSubStatus: number = 0;

        const errorMessage: string = 'token is invalid.';

        const resError: ResError =
        {
          status: errorStatus,
          subStatus: errorSubStatus,
          message: errorMessage
        };

        info(`${socket.id}: get messages failed. reason => ${errorMessage}`);

        return socket.emit('get-messages-response', failed(resError));
      }
    });

    socket.on('send-message', (request): boolean =>
    {
      info(`${socket.id}: send message`);

      const sendMessageSchema = joi.object(
      {
        token: joi.string().required().messages(
        {
          'string.base': '400|101|\'token\' must be a string.',
          'string.empty': '400|102|\'token\' must not be empty.',
          'any.required': '400|103|\'token\' is required.'
        }),
        tempChat: joi.object(
        {
          id: joi.string().required().messages(
          {
            'string.base': '400|301|\'tempChat.id\' must be a string.',
            'string.empty': '400|302|\'tempChat.id\' must not be empty.',
            'any.required': '400|303|\'tempChat.id\' is required.'
          }),
          message: joi.string().required().messages(
          {
            'string.base': '400|401|\'tempChat.message\' must be a string.',
            'string.empty': '400|402|\'tempChat.message\' must not be empty.',
            'any.required': '400|403|\'tempChat.message\' is required.'
          })
        }).required().messages(
        {
          'object.base': '400|201|\'tempChat\' must be an object.',
          'any.required': '400|202|\'tempChat\' is required.'
        })
      });

      const {value: sendMessageValue, error: sendMessageError} = sendMessageSchema.validate(request);

      if (sendMessageError)
      {
        error(`${socket.id}: failed to validate request. payload => ${encrypt(JSON.stringify(sendMessageValue))}`);

        const errorStatus: number = parseInt(sendMessageError.message.split('|')[0]!);

        const errorSubStatus: number = parseInt(sendMessageError.message.split('|')[1]!);

        const errorMessage: string = sendMessageError.message.split('|')[2]!.toString();

        const resError: ResError =
        {
          status: errorStatus,
          subStatus: errorSubStatus,
          message: errorMessage
        };

        info(`${socket.id}: send message failed. reason => ${errorMessage}`);

        return socket.emit('send-message-response', failed(resError));
      }

      const reqSendMessage = sendMessageValue as ReqSendMessage;

      try
      {
        const payload = jwt.verify(reqSendMessage.token, process.env.JWT_SECRET_KEY) as SrvToken;

        const {id: userId} = payload;

        const newChat: SrvChat =
        {
          id: nanoid(),
          userId: userId,
          message: reqSendMessage.tempChat.message,
          timestamp: DateTime.utc().toISO()
        };

        const newClientChat: ResChat =
        {
          id: newChat.id,
          userId: newChat.userId,
          message: newChat.message,
          timestamp: newChat.timestamp
        };

        messages =
        [
          ...messages,
          newChat
        ];

        const resUpdateChat: ResUpdateChat =
        {
          chat: newClientChat
        };

        const resSendMessage: ResSendMessage =
        {
          tempChatId: reqSendMessage.tempChat.id,
          sentChat: newClientChat
        };

        socket.broadcast.to(room).emit('update-chat-response', success(resUpdateChat));

        info(`${socket.id}: send message success`);

        return socket.emit('send-message-response', success(resSendMessage));
      }
      catch
      {
        error(`${socket.id}: failed to verify token. token => ${encrypt(reqSendMessage.token)}`);

        const errorStatus: number = 403;

        const errorSubStatus: number = 0;

        const errorMessage: string = 'token is invalid.';

        const resError: ResError =
        {
          status: errorStatus,
          subStatus: errorSubStatus,
          message: errorMessage
        };

        info(`${socket.id}: send message failed. reason => ${errorMessage}`);

        return socket.emit('send-message-response', failed(resError));
      }
    });

    socket.on('update-user', (request): boolean =>
    {
      info(`${socket.id}: update user`);

      const updateUserSchema = joi.object(
      {
        token: joi.string().required().messages(
        {
          'string.base': '400|101|\'token\' must be a string.',
          'string.empty': '400|102|\'token\' must not be empty.',
          'any.required': '400|103|\'token\' is required.'
        }),
        user: joi.object(
        {
          name: joi.string().required().messages(
          {
            'string.base': '400|301|\'user.name\' must be a string.',
            'string.empty': '400|302|\'user.name\' must not be empty.',
            'any.required': '400|303|\'user.name\' is required.'
          }),
          status: joi.string().required().messages(
          {
            'string.base': '400|401|\'user.status\' must be a string.',
            'string.empty': '400|402|\'user.status\' must not be empty.',
            'any.required': '400|403|\'user.status\' is required.'
          })
        }).required().messages(
        {
          'object.base': '400|201|\'user\' must be an object.',
          'any.required': '400|202|\'user\' is required.'
        })
      });

      const {value: updateUserValue, error: updateUserError} = updateUserSchema.validate(request);

      if (updateUserError)
      {
        error(`${socket.id}: failed to validate request. payload => ${encrypt(JSON.stringify(updateUserValue))}`);

        const errorStatus: number = parseInt(updateUserError.message.split('|')[0]!);

        const errorSubStatus: number = parseInt(updateUserError.message.split('|')[1]!);

        const errorMessage: string = updateUserError.message.split('|')[2]!.toString();

        const resError: ResError =
        {
          status: errorStatus,
          subStatus: errorSubStatus,
          message: errorMessage
        };

        info(`${socket.id}: update user failed. reason => ${errorMessage}`);

        return socket.emit('update-user-response', failed(resError));
      }

      const reqUpdateUser = updateUserValue as ReqUpdateUser;

      try
      {
        const payload = jwt.verify(reqUpdateUser.token, process.env.JWT_SECRET_KEY) as SrvToken;

        const {id: userId} = payload;

        users = users.map((existingUser): SrvUser =>
        {
          if (existingUser.id === userId)
          {
            const updatedUser: SrvUser =
            {
              ...existingUser,
              name: reqUpdateUser.user.name,
              status: reqUpdateUser.user.status,
              modifiedDate: DateTime.utc().toISO()
            };

            const updatedClientUser: ResUser =
            {
              id: updatedUser.id,
              name: updatedUser.name,
              status: updatedUser.status
            };

            const resUpdateUser: ResUpdateUser =
            {
              user: updatedClientUser
            };

            info(`${socket.id}: update user success`);

            theLounge.in(room).emit('update-user-response', success(resUpdateUser));

            return updatedUser;
          }

          return existingUser;
        });
      }
      catch
      {
        error(`${socket.id}: failed to validate token. token => ${encrypt(reqUpdateUser.token)}`);

        const errorStatus: number = 403;

        const errorSubStatus: number = 0;

        const errorMessage: string = 'token is invalid.';

        const resError: ResError =
        {
          status: errorStatus,
          subStatus: errorSubStatus,
          message: errorMessage
        };

        info(`${socket.id}: update user failed. reason => ${errorMessage}`);

        socket.emit('update-user-response', failed(resError));
      }

      return true;
    });

    socket.on('disconnect', (): void =>
    {
      info(`${socket.id}: disconnected`);

      const disconnectedUser = users.find((existingUser): boolean => existingUser.socket === socket.id);

      if (disconnectedUser)
      {
        users = users.map((existingUser): SrvUser =>
        {
          if (existingUser.id === disconnectedUser.id)
          {
            const updatedUser: SrvUser =
            {
              ...existingUser,
              status: 'reconnect',
              modifiedDate: DateTime.utc().toISO()
            };

            const updatedClientUser: ResUser =
            {
              id: updatedUser.id,
              name: updatedUser.name,
              status: updatedUser.status
            };

            const resUpdateUser: ResUpdateUser =
            {
              user: updatedClientUser
            };

            theLounge.in(room).emit('update-user-response', success(resUpdateUser));

            return updatedUser;
          }

          return existingUser;
        });

        setTimeout((): void =>
        {
          users = users.map((existingUser): SrvUser =>
          {
            if (existingUser.id === disconnectedUser.id && existingUser.status === 'reconnect')
            {
              const updatedUser: SrvUser =
              {
                ...existingUser,
                status: 'offline',
                socket: null,
                modifiedDate: DateTime.utc().toISO()
              };

              const updatedClientUser: ResUser =
              {
                id: updatedUser.id,
                name: updatedUser.name,
                status: updatedUser.status
              };

              const newInfo: SrvInfo =
              {
                id: nanoid(),
                userId: existingUser.id,
                activity: 'leave',
                timestamp: DateTime.utc().toISO()
              };

              const newClientInfo: ResInfo =
              {
                id: newInfo.id,
                userId: newInfo.userId,
                activity: newInfo.activity,
                timestamp: newInfo.timestamp
              };

              messages =
              [
                ...messages,
                newInfo
              ];

              for (const user of users)
              {
                if (user.status !== 'offline' && user.socket && DateTime.fromISO(user.createdDate).toMillis() < DateTime.fromISO(existingUser.modifiedDate).toMillis())
                {
                  const resUpdateUser: ResUpdateUser =
                  {
                    user: updatedClientUser
                  };

                  const resUpdateInfo: ResUpdateInfo =
                  {
                    info: newClientInfo
                  };

                  theLounge.to(user.socket).emit('update-user-response', success(resUpdateUser));

                  theLounge.to(user.socket).emit('update-info-response', success(resUpdateInfo));
                }
              }

              return updatedUser;
            }

            return existingUser;
          });

          if (theLounge.sockets.size === 0)
          {
            users = [];
            messages = [];
          }
        },
        5000);
      }
    });
  });
};

export default theLoungeRouter;
