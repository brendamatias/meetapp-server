import { Router } from 'express';

const routes = new Router();

routes.get('/', (req, res) => res.send("IT'S WORK!"));

export default routes;
