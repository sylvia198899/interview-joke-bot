const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const request = require('superagent');

// Endpoint for drift conversation api
const CONVERSATION_API_BASE = 'https://driftapi.com/conversations';
// Endpoint for random joke fetch
const JOKE_URL = 'https://icanhazdadjoke.com';
const TOKEN = 'bkIhxWtMMeNYTDKOqvxw5g7NplG4xDbS';
const A_RANDOM_JOKE = 'TELL ME A JOKE';
const STOP_JOKE = 'Funny!';


// Send a drift message to be posted by the drift api.
const sendMessage = (conversationId, message) => {
    return request.post(CONVERSATION_API_BASE + `/${conversationId}/messages`)
        .set('Content-Type', 'application/json; charset=UTF-8')
        .set('Authorization', `bearer ${TOKEN}`)
        .send(message)
        .catch(err => console.log('send message error', err.response.body));
}

/*
 * Format the message content to json format.
 *
 * @param type: the message type
 * @param needButtons: a boolean value, if true then generates 2 buttons 'Tell me another joke!' & 'Funny!' and returns with the message, set default to false
 *
 * @return formatted message for Drift conversation api
 */
const formatMessage = (orgId, message, type, needButtons = false) => {
    // replace the special characters in the joke content to avoid posting error
    message = message.replace(/(?:\r\n|\r|\n)/g, '<br/>').replace(/\"/g, '\'');
    return `{
        "orgId": ${orgId},
        "body": "${message}",
        "type": "${type}"` + (needButtons ? `,
        "buttons": [
            {
              "label": "Tell me a joke!",
              "value": "${A_RANDOM_JOKE}",
              "reaction": {"type": "delete"}
            },{
              "label": "Funny!",
              "value": "${STOP_JOKE}",
              "type": "action",
              "reaction": {"type": "delete"}
            }
        ]` : "" ) + `
    }`;
}

// Get a random joke by calling the joke api.
const getRandomJoke = (cb) => {
    return request.get(JOKE_URL)
        .set('Accept', 'application/json')
        .then(cb)
        .catch(err => console.log('joke api error', err));
}

// Message handler for items posted in the conversation view.
const handleMessage = (orgId, data) => {
    const messageBody = data.body;
    const conversationId = data.conversationId;

    // if the message content contains 'tell me a joke' then call the joke api and return to the message
    if (messageBody.toUpperCase().includes(A_RANDOM_JOKE)) {
        getRandomJoke(res => {
            const driftMessage = formatMessage(orgId, res.body.joke, 'chat', true);
            sendMessage(conversationId, driftMessage);
        })
    } else if (messageBody == STOP_JOKE) {
        // if user clicks the 'Funny!' button, send a reply message back.
        sendMessage(conversationId, formatMessage(orgId, 'Thanks! Have a good day!', 'chat'));
    }
}

// Listen for a new Drift message
const PORT = process.env.PORT || 3000;
app.use(bodyParser.json());
app.listen(PORT, () => console.log(`Drift app listening on port ${PORT}!`));
app.post('/api', (req, res) => {
    if (req.body.type === 'new_message') {
        handleMessage(req.body.orgId, req.body.data)
    }
    return res.send('ok')
 });
