import Cloudant from 'cloudant';
import fs from 'fs';
import { logger } from '../utils/logger';

// Database configuration
const dbName = 'weights-data';
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

// FIXME: initialize URL properly

// Initialize cloudant connection
const cloudant = Cloudant(dbUrl);
cloudant.db.create(dbName, (err) => {
  if (err) {
    logger.info(`Could not create db ${dbName} - does it already exist?`);
  } else {
    logger.info(`Database initialized: ${dbName}`);
  }
});

// Use proper database
const db = cloudant.use(dbName);
db.list((err, allDbs) => {
  const dbstring = JSON.stringify(allDbs, null, 2);
  logger.info(`${dbName} databases ${dbstring}`);
});


export function getSampleData() {
  return [
    { timestamp: 10.00, weight: 1.4 },
    { timestamp: 40.00, weight: 2.7 },
    { timestamp: 60.00, weight: 3.4 },
  ];
}

export function getData() {
  logger.info('getData');
  return new Promise((resolve, reject) => {
    if (db) {
      db.fetch({}, (err, docs) => {
        if (err) {
          reject(err);
        }
        if (docs.rows.length === 0) {
          resolve([]);
        }
        const filtered = docs.rows
          // FIXMID FILTER .filter(...)
          .map(d => ({ timestamp: d.doc.timestamp, weight: d.doc.weight, diff: d.doc.diff }))
          .sort((a, b) => a.timestamp - b.timestamp);
        logger.info(`docs: ${JSON.stringify(filtered, null, 2)}`);
        resolve(filtered);
      });
    }
  });
}

export function getDataBetween(startTime, endTime) {
  logger.info(`getDataBetween ${startTime} - ${endTime}`);
  return new Promise((resolve, reject) => {
    if (db) {
      db.fetch({}, (err, docs) => {
        if (err) {
          reject(err);
        }
        if (docs.rows.length === 0) {
          resolve([]);
        }
        const filtered = docs.rows
          .map(d => ({ timestamp: d.doc.timestamp, weight: d.doc.weight, diff: d.doc.diff }))
          .filter(d => d.timestamp > startTime && d.timestamp < endTime)
          .sort((a, b) => a.timestamp - b.timestamp);
        logger.info(`docs: ${JSON.stringify(filtered, null, 2)}`);
        resolve(filtered);
      });
    }
  });
}
