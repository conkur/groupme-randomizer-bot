import * as Express from 'express';
import {applyMiddlewares} from './middlewares';
import {Robot} from './bot';

const app: Express.Application = Express();
applyMiddlewares(app);

app.get('/', (_req: Express.Request, res: Express.Response) => {
    res.send('Responding to a GET request!.. But why was I sent a GET request?');
});

// GroupMe sends a post request if a chat was sent to the group.
app.post('/', (req: Express.Request, res: Express.Response) => {
    robot.readMessage(req.body, req.useragent?.source ?? null);
    res.status(200).json({});
});

const robot = new Robot();

export default app;
