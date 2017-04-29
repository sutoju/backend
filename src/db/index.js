import Cloudant from 'cloudant';
import fs from 'fs';
import fetch from 'node-fetch';
import { logger } from '../utils/logger';

/* Database configuration */
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
const foodIndex = { name: 'type', type: 'json', index: { fields: ['type'] } };
foodDb.index(foodIndex, (err, response) => {
  if (err) {
    logger.info(`Could not index db ${foodDbName} - does it already exist?`);
  } else {
    logger.info(`Database initialized: ${foodDbName}`);
  }
})
*/
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

// TODO refactor to another files
/* FOOD STUFF */

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
          .map(d => ({
            _id: d.doc._id,
            _rev: d.doc._rev,
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

function grouped(list) {
  const array = [];
  list.forEach((item) => {
    const key = item.type;
    const mapItem = array.find(r => r.type === key);
    if (mapItem) {
      mapItem.count += 1;
      if (mapItem.expires > item.expires) {
        mapItem.expires = item.expires;
      }
    } else {
      array.push({ type: key, count: 1, expires: item.expires });
    }
  });
  return array;
}

export function sortedFood() {
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
          .map(d => ({
            _id: d.doc._id,
            _rev: d.doc._rev,
            type: d.doc.type,
            added: d.doc.added,
            expires: d.doc.expires,
          }))
          .filter(d => d.type && d.added && d.expires)
          .sort((a, b) => a.expires - b.expires);
        const sorted = grouped(filtered);
        resolve(sorted);
      });
    }
  });
}

export function getOldestFood(type) {
  return new Promise((resolve, reject) => {
    if (foodDb) {
      foodDb.fetch({}, (err, docs) => {
        if (err) {
          reject(err);
        }
        if (docs.rows.length === 0) {
          resolve({});
        }
        // Find foods of given type
        const filtered = docs.rows
          .map(d => ({
            _id: d.doc._id,
            _rev: d.doc._rev,
            type: d.doc.type,
            added: d.doc.added,
            expires: d.doc.expires,
          }))
          .filter(d => d.type && d.added && d.expires && d.type === type);
        if (filtered.length === 0) {
          resolve({});
        }
        // Get food with smallest expiration date
        let oldest = filtered[0];
        filtered.forEach((item) => {
          if (item.expires < oldest.expires) {
            oldest = item;
          }
        });
        resolve(oldest);
      });
    }
  });
}

export function deleteFood(item) {
  return new Promise((resolve, reject) => {
    fetch('https://sutoju-logic.eu-gb.mybluemix.net/removeItem', {
      method: 'POST',
      body: JSON.stringify({
        _id: item._id,
        _rev: item._rev,
      }),
    })
    .then((res) => {
      resolve(item);
    })
    .catch((err) => {
      reject(err);
    });
  });
}


/* WEIGHT STUFF */

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
        const filtered = docs.rows
          .map(d => ({ timestamp: d.doc.timestamp, weight: d.doc.weight, difference: d.doc.difference }))
          .sort((a, b) => a.timestamp - b.timestamp);
        resolve(filtered);
      });
    }
  });
}

export function getWeightDataBetween(startTime, endTime) {
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
        resolve(filtered);
      });
    }
  });
}
