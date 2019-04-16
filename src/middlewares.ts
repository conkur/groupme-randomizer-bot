import * as Express      from 'express';
import * as bodyParser   from 'body-parser';
import * as ExpressUseragent from 'express-useragent';

export const applyMiddlewares = (app: Express.Application) => {
  app.use(bodyParser.json());
  app.use(ExpressUseragent.express());
};
