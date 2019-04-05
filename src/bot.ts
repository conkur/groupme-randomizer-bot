import * as Request from 'request';

export class RobotSlave {

    /**
     * Reads the body of a GroupMe POST request, and sends a message back to the chat
     * if the bot didn't send the message prompting the GroupMe POST request.
     *
     * @static
     * @param {any} groupMeBody A message to send to chat
     */
    static readMessage = (groupMeBody: any) => {
        const BOT_NAME = process.env.BOT_NAME;
        const BOT_ID = process.env.BOT_ID;

        if (!BOT_ID || !BOT_NAME) {
            console.log('Bot info is unknown :(');
            return;
        }

        const userName: string = groupMeBody.name;

        // We don't want to reply to ourselves.
        if (userName === BOT_NAME) {
            return;
        }
        
        // Send a post to the chat.
        const options: Request.Options = {
            url: `https://api.groupme.com/v3/bots/post`,
            body: {
                bot_id: BOT_ID,
                text: `${userName} sent ${groupMeBody.text}`,
            },
            json: true,
        };
        const messageRequest = Request.post(options, (_error, res, _body) => {
            if (res.statusCode !== 202) {
                console.log(`Rejecting bad status code: ${res.statusCode}`);
            }
        });
        messageRequest.on('error', (error) => {
            console.log(`Caught error when sending message: ${error}`);
        });
        messageRequest.on('timeout', (error) => {
            console.log(`Timed out during sending message: ${error}`);
        });
    };
}