import express from 'express';
import http from 'http';
import { envConfig } from './configuration/environmentConfig.js';
import { appConfig } from './app.js';
import { dbConfig } from './configuration/databaseConfiguration.js';
import { initSocket } from './socket.js';
import { startSubscriptionCron } from './helpers/cronJobHelpers.js';

const port = envConfig.PORT || 3000;
const app = express();

appConfig(app);

const httpServer = http.createServer(app);
initSocket(httpServer);

const server = httpServer.listen(port, () => {
  dbConfig();
  console.log(`App running on port ${port}.`);

  startSubscriptionCron();
});

process.on('uncaughtException', err => {
  console.error('uncaughtException', err.name, err.message);
});

process.on('unhandledRejection', err => {
  console.error('unhandledRejection', err.name, err.message);
  server.close(() => process.exit(1));
});
