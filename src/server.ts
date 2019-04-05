import * as Express from 'express';
import {applyMiddlewares} from './middlewares';
import {RobotSlave} from './bot';

const app: Express.Application = Express();

applyMiddlewares(app);

app.get('/', (_req: Express.Request, res: Express.Response) => {
    res.send('Responding to a GET request!.. But why was I sent a GET request?');
});

// GroupMe sends a post request if a chat was sent to the group.
app.post('/', (req: Express.Request, res: Express.Response) => {
    RobotSlave.readMessage(req.body);
    res.status(200).json({});
});

export default app;