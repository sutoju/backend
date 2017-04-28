import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { logger, logStream } from './utils/logger';
import { getData, getDataBetween } from './db/index';

logger.info(getData);

const app = express();
const port = process.env.VCAP_APP_PORT || 3000;


app
.use(cors())
.use(morgan('dev', { stream: logStream }))
.use(bodyParser.json())
.use(bodyParser.urlencoded({ extended: false }))
.get('/', (req, res) => {
  res.json({ status: 'up' });
})
.get('/weightData', (req, res) => {
  // Fetch all data
  getData()
  .then((data) => {
    logger.info('/weightData', data);
    res.json(data);
  });
})
.get('/weightDataBetween', (req, res) => {
  logger.info(req.query);
  const startTime = parseInt(req.query.start, 10);
  const endTime = parseInt(req.query.end, 10);
  logger.info(`weightDataBetween ${startTime} - ${endTime}`);
  if (isNaN(startTime) || isNaN(endTime)) {
    return res.status(400).json({ error: 'startTime and/or endTime parameters invalid' });
  }
  // Fetch data between given time
  return getDataBetween(startTime, endTime)
  .then((data) => {
    logger.info('/weightData', data);
    return res.json(data);
  });
});

app.listen(port, () => logger.info(`server running on ${port}`));
