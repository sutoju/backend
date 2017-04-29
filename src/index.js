import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import fetch from 'node-fetch';
import { logger, logStream } from './utils/logger';
import { getWeightData,
  getWeightDataBetween,
  getFoodData,
  sortedFood,
  getOldestFood,
  addFood,
  deleteFood,
} from './db/index';
import { searchRecipes, getRecipe } from './utils/recipe';

const app = express();
const port = process.env.VCAP_APP_PORT || 3000;


app
.use(cors())
.use(morgan('dev', { stream: logStream }))
.use(bodyParser.json())
.use(bodyParser.urlencoded({ extended: false }))
// Show status
.get('/', (req, res) => res.json({ status: 'up' }))
// Fetch all weight data
.get('/weightData', (req, res) => {
  getWeightData()
  .then(data => res.json(data));
})
// Fetch weight data between start and end times
.get('/weightDataBetween', (req, res) => {
  logger.info(req.query);
  const startTime = parseInt(req.query.start, 10);
  const endTime = parseInt(req.query.end, 10);
  logger.info(`weightDataBetween ${startTime} - ${endTime}`);
  if (isNaN(startTime) || isNaN(endTime)) {
    return res.status(400).json({ error: 'startTime and/or endTime parameters invalid' });
  }
  // Fetch data between given time
  return getWeightDataBetween(startTime, endTime)
  .then(data => res.json(data));
})
// Fetch all food data
.get('/foodData', (req, res) => {
  getFoodData()
  .then(data => res.json(data));
})
// Fetch sorted food data by expiry date
.get('/sortedFood', (req, res) => {
  sortedFood()
  .then(data => res.json(data));
})
// Fetch all recipes for the soon-to-expire food items
.get('/recipes', (req, res) => {
  sortedFood()
  .then((data) => {
    const items = data.slice(0, 2)
    .map(i => i.type);
    searchRecipes(items)
    .then((recipes) => {
      res.json(recipes);
    });
  });
})
// Fetch the detailed information for a recipe
.get('/recipes/:id', (req, res) => {
  getRecipe(req.params.id)
  .then(recipes => res.json(recipes));
})
// Post new food item
.post('/food/:type', (req, res) => {
  if (req.body.password !== process.env.SUTOJUPASSWORD) {
    logger.info('failed auth', req.body.password);
    return res.status(403).json({ error: 'Invalid password for data modification.' });
  }
  return addFood(req.params.type)
  .then(foodItem => res.json(foodItem));
})
// Delete existing food item
.delete('/food/:type', (req, res) => {
  if (req.body.password !== process.env.SUTOJUPASSWORD) {
    logger.info('failed auth', req.body.password);
    return res.status(403).json({ error: 'Invalid password for data modification.' });
  }
  return getOldestFood(req.params.type)
  .then((foodItem) => {
    deleteFood(foodItem)
    .then((deletedItem) => {
      res.json(deletedItem);
    });
  });
})
.get('/initWeights', (req, res) => {
  const initialWeights = [{ difference: 110, weight: 110, time: 1493321513 }, { difference: 150, weight: 260, time: 1493364713 }, { difference: 50, weight: 310, time: 1493386313 }, { difference: 76, weight: 386, time: 1493429513 }, { difference: 200, weight: 586, time: 1493443913 }, { difference: 30, weight: 30, time: 1493469113 }];
  initialWeights.forEach((val) => {
    fetch('https://sutoju-logic.eu-gb.mybluemix.net/initWeight', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        time: val.time,
        weight: val.weight,
        difference: val.difference,
      }),
    });
  });
  res.json({ status: 'ok' });
});

app.listen(port, () => logger.info(`server running on ${port}`));
