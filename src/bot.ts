import * as Request from 'request';

export class RobotSlave {

    /**
     * Reads the body of a GroupMe POST request, and sends a message back to the chat
     * pinging every one if the message included the text `@all`
     *
     * @static
     * @param groupMeBody The info that GroupMe sent to the bot
     */
    static readMessage = (groupMeBody: any): void | undefined => {

        // We don't want to do anything if the bot itself sent the message.
        if (groupMeBody.name === process.env.BOT_NAME) {
            return;
        }

        // TODO: Make this check more strict. If someone's username begins with '@all' then that will cause a problem.
        if (groupMeBody.text.includes('@all')) {
            RobotSlave.mentionEveryone(groupMeBody.text);
        }
    };

    private static mentionEveryone = (text: string): void => {
        const options: Request.Options = {
            url: `https://api.groupme.com/v3/groups/${process.env.GROUP_ID}`,
            qs: {
                token: process.env.GROUPME_ACCESS_TOKEN,
            },
            json: true,
        };

        // Since we need a list of user IDs to mention everyone, we need to make a request to get all the user IDs.
        const getMemberIdsRequest = Request.get(options, (error, res, _body): void | undefined => {
            if (res.statusCode !== 200) {
                console.log(`Rejecting bad status code: ${res.statusCode}. Error: ${error}`);
                return;
            }

            const attachments = [{
                loci: [] as any[],
                type: "mentions",
                user_ids: [] as string[],
            }];
        
            // Create the list of user IDs. Each user in this list will be pinged.
            // TODO: Does GroupMe handle not pinging those who have muted the group, or do we need to make that check ourselves?
            res.body.response.members.forEach((member: any, index: number) => {
                attachments[0].loci.push([index, index + 1]); // TODO: Would [i, i] work?
                attachments[0].user_ids.push(member.user_id);
            });

            // Send the message which will ping everyone in the group.
            RobotSlave.sendMessageToGroupMe(text, attachments);
        });
        getMemberIdsRequest.on('error', (error) => {
            console.log(`Caught error during mentioning everyone: ${error}`);
        });
        getMemberIdsRequest.on('timeout', (error) => {
            console.log(`Timed out during mentioning everyone: ${error}`);
        });
    }

    private static sendMessageToGroupMe = (text: string, attachments?: any[]): void | undefined => {
        const BOT_ID = process.env.BOT_ID;
        if (!BOT_ID) {
            console.log('Bot info is unknown :(. Message was not sent.');
            return;
        }

        // Send a post to the chat.
        const options: Request.Options = {
            url: 'https://api.groupme.com/v3/bots/post',
            body: {
                text,
                attachments,
                bot_id: BOT_ID,
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
    }
}
