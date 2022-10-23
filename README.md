# groupme-randomizer-bot

<i>README is still a WIP.</i>

#### GroupMe bot, built with Nodejs.

## Features

<i>All commands are case-insensitive.</i>

1. Send a random post from a specified subreddit.
    - <i>Example: `memes plz shittydarksouls`</i>
    - Write `memes plz <subreddit_name>` and the bot will send a random image/url/self post.
    - If `<subreddit_name>` is not specified, a random post from the specified default subreddit (determined by `process.env.DEFAULT_SUBREDDIT`) is sent.
2. Mention everybody in the chat. **_(Currently broken!)_**
    - Write `@all` to the group, and the bot will send a message which pings everybody in the chat.
    
## How to use in your GroupMe group
1. [Create your own GroupMe bot](https://dev.groupme.com/).
2. Make a fork, etc. of this repo and host it somewhere.
3. Edit your GroupMe bot's callback URL to point to the URL where your fork is hosted (step 2).
4. If using the Reddit features, you must have an [authorized app](www.reddit.com/prefs/apps/) created .
4. Make sure your process.env variables point to your bot ID, group ID, etc. (see 'Configurations' below for more detail)
5. Enjoy this not perfect / possibly not functional bot.

## API's used
- [GroupMe](https://dev.groupme.com/)
- [Reddit authorized app](www.reddit.com/prefs/apps/)
- [Snoowrap (wrapper for Reddit API)](https://github.com/not-an-aardvark/snoowrap)

## Configurations

### Environment variables (all are required, unless specified otherwise)

#### GroupMe 
1. `BOT_ID`: Bot ID, given by GroupMe.
2. `BOT_NAME`: Name of the bot, which you gave to GroupMe when creating the bot.
3. `GROUP_ID`: ID of the GroupMe group that this bot is added to.
4. `GROUPME_ACCESS_TOKEN`: Access token, given by GroupMe.

### Reddit
5. `REDDIT_ID`: ID of your authorizied Reddit app.
6. `REDDIT_SECRET`: Secret of your authorizied Reddit app.
7. `REDDIT_REFRESH_TOKEN`: Reddit refresh token, which you must generate.
    - See [here](https://github.com/not-an-aardvark/reddit-oauth-helper) for an easy way to get a generated refresh token.
    
### Enabling features
8. (optional) `SHOULD_MENTION_ALL`: set to `true` to enable the `@all` functionality. (by default, the bot assumes you don't want this feature).
9. (optional) `SHOULD_SEND_MEMES`: set to `true` to enable the `memes plz` functionality. (by default, the bot assumes you don't want this feature).
10. (optional) `SEND_ONLY_IMAGE`: set to `true` if you want the `memes plz` functionality to just send the image, rather than a link to the reddit post.
