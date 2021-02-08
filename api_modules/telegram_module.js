/*
 * Copyright 2018 Nathan Tyler Brooks
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/* module requirements */
const Telegraf = require('telegraf');

/* module setup */
const NAME = 'Telegram Api';
const VERSION = '1.1';
const URI = '/TelegramAPI';
const CLIENTID = 'Telegram';

// these will be initialized in module.exports.init
var apiHandler = null;
var webApp = null;

module.exports = {
  name: NAME,
  version: VERSION,
  uri: URI,
  clientID: CLIENTID,

  init: (parentBotApi, parentWebApp) => {
    apiHandler = parentBotApi;
    webApp = parentWebApp;

    apiHandler.on('sendMessage', sendMessage);
    //apiHandler.on('updateStatus', updateStatus);
    webApp.get(URI, getRootPage);
  },

  free: () => {
    apiHandler.removeListener('sendMessage', sendMessage);

    apiHandler = null;
    webApp = null;
  },

  getCommands: () => {
    return '';
  }
}

/* Initialize Telegram API */
const bot = new Telegraf(process.env.TEL_API_KEY);

bot.on('text', (ctx) => {
  var newMessage = new apiHandler.Message(CLIENTID,
    CLIENTID + ctx.message.from.id + ctx.message.chat.id,
    ctx.message.text,
    ctx.message.from.first_name,
    ctx.message,
    {});

  if('reply_to_message' in newMessage.content) {
    newMessage.extras.replyToText = newMessage.content.reply_to_message.text;
  }

  Object.freeze(newMessage);
  apiHandler.receiveMessage(newMessage);
});

function sendMessage(message) {
  if(message.clientID == CLIENTID) {
    /* Handle Extras */
    var reply = false;
    var replyTo = 0;

    if('isReply' in message.extras && message.extras.isReply) {
      reply = true;
      replyTo = message.content.message_id;
    }

    if('isReplyToReply' in message.extras && message.extras.isReplyToReply &&
        'reply_to_message' in message.content) {
      reply = true;
      replyTo = message.content.reply_to_message.message_id;
    }

    if (message.text.split(/\s/) <= 1) {
      bot.telegram.sendMessage(message.content.chat.id, `<empty message>`,
        {reply_to_message_id: (reply ? replyTo : undefined)});
    } else {
      var i = 0;
      while (i != message.text.length) {
        var tmp = i;
        i = Math.min(i + 4096, message.text.length);
        bot.telegram.sendMessage(message.content.chat.id,
          message.text.substring(tmp, i),
          {reply_to_message_id: (reply ? replyTo : undefined)});
      }
    }
  }
}

bot.launch();

function updateStatus(event) {
  if (event.message.clientID == CLIENTID) {
    var action = 'NOACTION';
    var message = event.message;

    switch (event.status) {
      case apiHandler.statusList.typing:
        action = 'typing';
        break;
      default:;
    }

    if (action != 'NOACTION') {
      bot.telegram.sendChatAction(action, message.content.chat.id)
        .catch((err) => {
          console.log(err.toString());
        });
    }
  }
}

/* Web Handler */
function getRootPage(req, res) {
  res.render('root', webApp.getOptions(req, {name: NAME, version: VERSION}));
}