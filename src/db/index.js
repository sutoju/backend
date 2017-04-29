import Cloudant from 'cloudant';
import fs from 'fs';
import { logger } from '../utils/logger';

// Database configuration
const weightDbName = 'weights-data';
const foodDbName = 'food-data';
let dbUrl;

function getDbUrl(jsonData) {
  const vcapServices = JSON.parse(jsonData);
  // Find Cloudant service in VCAP_SERVIES
  for (const vcapService in vcapServices) {
    if (vcapService.match(/cloudant/i)) {
      return vcapServices[vcapService][0].credentials.url;
    }
  }
  return '';
}

if (process.env.VCAP_SERVICES) { // IBM bluemix host
  dbUrl = getDbUrl(process.env.VCAP_SERVICES);
} else { // Local host
  dbUrl = getDbUrl(fs.readFileSync('vcap-local.json', 'utf-8'));
}

// Initialize cloudant connection
const cloudant = Cloudant(dbUrl);
cloudant.db.create(weightDbName, (err) => {
  if (err) {
    logger.info(`Could not create db ${weightDbName} - does it already exist?`);
  } else {
    logger.info(`Database initialized: ${weightDbName}`);
  }
});
cloudant.db.create(foodDbName, (err) => {
  if (err) {
    logger.info(`Could not create db ${foodDbName} - does it already exist?`);
  } else {
    logger.info(`Database initialized: ${foodDbName}`);
  }
});

// Use proper database
const weightDb = cloudant.use(weightDbName);
const foodDb = cloudant.use(foodDbName);
/*
weightDb.list((err, allDbs) => {
  const dbstring = JSON.stringify(allDbs, null, 2);
  logger.info(`${weightDbName} data ${dbstring}`);
});
foodDb.list((err, allDbs) => {
  const dbstring = JSON.stringify(allDbs, null, 2);
  logger.info(`${foodDbName} data ${dbstring}`);
});
*/

export function getFoodData() {
  return new Promise((resolve, reject) => {
    if (foodDb) {
      foodDb.fetch({}, (err, docs) => {
        if (err) {
          reject(err);
        }
        if (docs.rows.length === 0) {
          resolve([]);
        }
        const filtered = docs.rows
          // FIXMID FILTER .filter(...)
          .map(d => ({
            id: d.doc._id,
            rev: d.doc._rev,
            type: d.doc.type,
            added: d.doc.added,
            expires: d.doc.expires,
          }))
          .filter(d => d.type && d.added && d.expires)
          .sort((a, b) => a.expires - b.expires);
        resolve(filtered);
      });
    }
  });
}

export function getWeightData() {
  return new Promise((resolve, reject) => {
    if (weightDb) {
      weightDb.fetch({}, (err, docs) => {
        if (err) {
          reject(err);
        }
        if (docs.rows.length === 0) {
          resolve([]);
        }
        logger.info(JSON.stringify(docs.rows, null, 2));
        const filtered = docs.rows
          // FIXMID FILTER .filter(...)
          .map(d => ({ timestamp: d.doc.timestamp, weight: d.doc.weight, difference: d.doc.difference }))
          .sort((a, b) => a.timestamp - b.timestamp);
        //logger.info(`docs: ${JSON.stringify(filtered, null, 2)}`);
        resolve(filtered);
      });
    }
  });
}

export function getWeightDataBetween(startTime, endTime) {
  logger.info(`getDataBetween ${startTime} - ${endTime}`);
  return new Promise((resolve, reject) => {
    if (weightDb) {
      weightDb.fetch({}, (err, docs) => {
        if (err) {
          reject(err);
        }
        if (docs.rows.length === 0) {
          resolve([]);
        }
        const filtered = docs.rows
          .map(d => ({ timestamp: d.doc.timestamp, weight: d.doc.weight, difference: d.doc.difference }))
          .filter(d => d.timestamp > startTime && d.timestamp < endTime && d.weight > 0)
          .sort((a, b) => a.timestamp - b.timestamp);
        logger.info(`docs: ${JSON.stringify(filtered, null, 2)}`);
        resolve(filtered);
      });
    }
  });
}
