import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { logger, logStream } from './utils/logger';

const app = express();
const port = 3000;


app
.use(cors())
.use(morgan('dev', { stream: logStream }))
.use(bodyParser.json())
.use(bodyParser.urlencoded({ extended: false }))
.get('/', (req, res) => {
  res.json({ status: 'up' });
})
.get('/weightData', (req, res) => {
  const data = [
    { timestamp: 10.00, weight: 1.4 },
    { timestamp: 40.00, weight: 2.7 },
    { timestamp: 60.00, weight: 3.4 },
  ];
  logger.info('/weightData', data);
  res.json(data);
});

app.listen(port, () => logger.info(`server running on ${port}`));
