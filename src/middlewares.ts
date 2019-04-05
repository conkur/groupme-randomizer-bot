import * as Express      from 'express';
import * as bodyParser   from 'body-parser';

export const applyMiddlewares = (app: Express.Application) => {
  app.use(bodyParser.json());
};
