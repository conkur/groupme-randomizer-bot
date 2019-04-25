import * as Request from 'request';
import * as Snoowrap from 'snoowrap';

interface IAttachment {
    type: string;
}

interface IImageAttachment extends IAttachment {
    type: 'image';
    url: string;
}

interface IMentionAttachment extends IAttachment {
    type: 'mentions';
    loci: any[];
    user_ids: string[];
}

export class RobotSlave {
    private readonly MEME_TRIGGERS = ['MEMES PLZ', 'MEMES PLS', 'MEMEME'];
    private readonly MENTION_ALL_TRIGGER = '@ALL';
    private readonly DEFAULT_MEME_TEXT = 'One spicy meme coming up boss:';

    private readonly GROUP_API_OPTIONS: Request.Options = {
        url: `https://api.groupme.com/v3/groups/${process.env.GROUP_ID}`,
        qs: {
            token: process.env.GROUPME_ACCESS_TOKEN,
        },
        json: true,
    }

    private readonly SNOO: Snoowrap = new Snoowrap({
        userAgent: 'unknown',
        clientId: process.env.REDDIT_ID,
        clientSecret: process.env.REDDIT_SECRET,
        refreshToken: process.env.REDDIT_REFRESH_TOKEN,
    });

    /**
     * Reads the body of a GroupMe POST request, and sends a message back to the chat
     * pinging every one if the message included the text `@all`
     *
     * @static
     * @param groupMeBody The info that GroupMe sent to the bot
     */
    readMessage(groupMeBody: any, userAgent?: string | null): void | undefined {
        if (userAgent) {
            this.SNOO.userAgent = userAgent;
        }

        // We don't want to do anything if the bot itself sent the message, or if no text was sent.
        if (!groupMeBody.text || (groupMeBody.name === process.env.BOT_NAME)) {
            return;
        }

        const upperText: string = groupMeBody.text.toUpperCase();

        // TODO: Make this check more strict. If someone's username begins with '@all' then that will cause a problem.
        if (process.env.SHOULD_MENTION_ALL && upperText.toUpperCase().includes(this.MENTION_ALL_TRIGGER)) {
            this.mentionEveryone(groupMeBody.text);
            return;
        }

        // The only other possible command is to send a meme. If we don't want that command enabled, then just do nothing.
        if (!process.env.SHOULD_SEND_MEMES) {
            return;
        }
        
        // If the text matches anything in the array of meme triggers, then send a random meme from reddit.
        // Matching input example: 'memes plz shittyrainbow6'
        const matchedMemeTrigger: string | undefined = this.MEME_TRIGGERS.find(trigger => upperText.includes(trigger));
        if (!matchedMemeTrigger) {
            return;
        }

        const args: string[] = upperText.split(matchedMemeTrigger); // ['memes plz', 'shittyrainbow6']
        const specifiedSubreddit: string = args[args.length - 1].trim(); // 'shittyrainbow6'
        this.sendRedditImage(specifiedSubreddit || process.env.DEFAULT_SUBREDDIT);
    };

    private mentionEveryone(text: string): void {

        // Since we need a list of user IDs to mention everyone, we need to make a request to get all the user IDs.
        const getMemberIdsRequest = Request.get(this.GROUP_API_OPTIONS, (error, res, _body): void | undefined => {
            if (res.statusCode !== 200) {
                console.log(`Rejecting bad status code: ${res.statusCode}. Error: ${error}`);
                return;
            }

            const attachments: IMentionAttachment[] = [{
                loci: [],
                type: "mentions",
                user_ids: [],
            }];
        
            // Create the list of user IDs. Each user in this list will be pinged.
            // TODO: Does GroupMe handle not pinging those who have muted the group, or do we need to make that check ourselves?
            res.body.response.members.forEach((member: any, index: number) => {
                attachments[0].loci.push([index, index + 1]); // TODO: Would [i, i] work?
                attachments[0].user_ids.push(member.user_id);
            });

            // Send the message which will ping everyone in the group.
            this.sendMessageToGroupMe(text, attachments);
        });
        getMemberIdsRequest.on('error', (error) => {
            console.log(`Caught error during mentioning everyone: ${error}`);
        });
        getMemberIdsRequest.on('timeout', (error) => {
            console.log(`Timed out during mentioning everyone: ${error}`);
        });
    }

    private sendRedditImage(subredditName = 'shittydarksouls'): void {
        console.log(`Firing request to get random submssion from ${subredditName}`);
        this.SNOO.getSubreddit(subredditName).getRandomSubmission().then((submissions: Snoowrap.Submission | Snoowrap.Submission[]): void | undefined => {
            if (!submissions) {
                this.reportSubmissionNotFound();
                return;
            }

            if (Array.isArray(submissions)) { // Handle an array of submissions.
                this.sendRandomSubmissionFromArray(submissions);
            } else if (submissions.is_self) { // Handle a single text submission.
                this.sendSelfTextToGroupMe(submissions);
            } else { // Handle a single URL submission.
                this.sendURLSubmission(submissions);
            }
        }).catch((error: any) => {
            console.log(`Error when getting random submission. Error: ${error}`);
        });
    }

    private sendRandomSubmissionFromArray(submissions: Snoowrap.Submission[]): void | undefined {
        console.log(`Array of submissions returned.`);
        if (submissions.length === 0) {
            this.reportSubmissionNotFound();
            return;
        }
        const getRandomArrayItem = (arr: any[]) => arr[Math.floor(Math.random() * submissions.length)];
        const urlSubmissions: Snoowrap.Submission[] = submissions.filter(submission => !submission.is_self);
        if (urlSubmissions.length === 0) {
            this.sendSelfTextToGroupMe(getRandomArrayItem(submissions));
        } else {
            this.sendURLSubmission(getRandomArrayItem(urlSubmissions), this.DEFAULT_MEME_TEXT);
        }
    }

    private sendURLSubmission(submission: Snoowrap.Submission, text = ''): void | undefined {
        if (submission.post_hint === 'image') {
            if (process.env.SHOULD_SEND_IMAGE_ONLY || !submission.permalink) {
                this.sendImageToGroupMe(submission, text);
            } else {
                this.sendRedditPostToGroupMe(submission, text);
            }
            return;
        }

        const url: string = submission.url;
        if (url.includes('reddit.com/r/')) {
            this.handleRedirectToSubreddit(submission, url);
        } else {
            console.log(`Sending url: ${url}`);
            this.sendMessageToGroupMe(url);
        }
    }

    /**
     * If a submission forwards to a subreddit, then grab a meme from that subreddit.
     * If the submission forwards to the same subreddit as the subreddit where the submission came from, then do nothing
     * or else we'd hit an infinite loop.
     * @param submission
     * @param url - e.g. reddit.com/r/shittyrainbow6
     */
    private handleRedirectToSubreddit(submission: Snoowrap.Submission, url: string): void {
        const forwardedSubredditName: string = url.split('reddit.com/r/')[1];
        if (forwardedSubredditName === submission.subreddit.display_name) {
            console.log(`URL redirects to same subreddit. Nothing sent`);
            return;
        }
        console.log(`URL redirects to different subreddit: ${forwardedSubredditName}`);
        this.sendRedditImage(forwardedSubredditName);
    }

    private sendImageToGroupMe(submission: Snoowrap.Submission, text = ''): void | undefined {
        if (this.wasSubmissionNotFound(submission)) {
            this.reportSubmissionNotFound();
            return;
        }
        console.log(`Sending direct image: ${submission.url}`);
        this.sendMessageToGroupMe(text, [{
            url: submission.url,
            type: 'image',
        }] as IImageAttachment[]);
    }

    private sendSelfTextToGroupMe(submission: Snoowrap.Submission): void | undefined {
        if (this.wasSubmissionNotFound(submission)) {
            this.reportSubmissionNotFound();
            return;
        }
        console.log(`Submission was not a URL. Sending text from ${submission.subreddit.display_name}`);
        this.sendMessageToGroupMe(submission.selftext);
    }

    private sendRedditPostToGroupMe(submission: Snoowrap.Submission, text: string): void | undefined {
        if (this.wasSubmissionNotFound(submission)) {
            this.reportSubmissionNotFound();
            return;
        }
        const redditPostURL = `www.reddit.com${submission.permalink}`;
        console.log(`Sending link to post: ${redditPostURL}`);
        this.sendMessageToGroupMe(`${text}\n\n${redditPostURL}`);
    }

    private sendMessageToGroupMe(text?: string, attachments?: IAttachment[]): void | undefined {
        const BOT_ID = process.env.BOT_ID;
        if (!BOT_ID) {
            console.log('Bot info is unknown :(. Nothing sent.');
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

    private wasSubmissionNotFound = (submission: Snoowrap.Submission): boolean => submission && submission.subreddit ? false : true;
    private reportSubmissionNotFound = (text = `No random submissions found! Nothing sent`) => {
        console.log(text);
    }
}
