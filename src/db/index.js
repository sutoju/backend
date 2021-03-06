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

export function initWeights() {
  const initialWeights = [{ difference: 110, weight: 110, time: 1493321513 }, { difference: 150, weight: 260, time: 1493364713 }, { difference: 50, weight: 310, time: 1493386313 }, { difference: 76, weight: 386, time: 1493429513 }, { difference: 200, weight: 586, time: 1493443913 }, { difference: 30, weight: 30, time: 1493469113 }];
  initialWeights.forEach((val) => {
    fetch('https://sutoju-logic.eu-gb.mybluemix.net/initWeight', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timestamp: val.time,
        weight: val.weight,
        difference: val.difference,
      }),
    });
  });
}

export function initItems() {
  const now = Math.floor(Date.now() / 1000.0);
  const applePrototype = { type: 'apple', added: now - (24 * 3600), expires: now + (48 * 3600) };
  const ricePrototype = { type: 'rice', added: now - (5 * 24 * 3600), expires: now + (270 * 24 * 3600) };
  const honeyPrototype = { type: 'honey', added: now - (5 * 24 * 3600), expires: now + (350 * 24 * 3600) };
  const addItem = (body) => {
    fetch('https://sutoju-logic.eu-gb.mybluemix.net/initItem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  };
  addItem(applePrototype);
  addItem(applePrototype);
  addItem(applePrototype);
  addItem(applePrototype);
  addItem(applePrototype);
  addItem(ricePrototype);
  addItem(ricePrototype);
  addItem(ricePrototype);
  addItem(honeyPrototype);
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
    initWeights();
  }
});
cloudant.db.create(foodDbName, (err) => {
  if (err) {
    logger.info(`Could not create db ${foodDbName} - does it already exist?`);
  } else {
    logger.info(`Database initialized: ${foodDbName}`);
    initItems();
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
export function addFood(item) {
  return new Promise((resolve, reject) => {
    fetch('https://sutoju-logic.eu-gb.mybluemix.net/submitItem', {
      method: 'POST',
      body: JSON.stringify({
        type: item,
      }),
    })
    .then((res) => {
      resolve({ added: item });
    })
    .catch((err) => {
      reject(err);
    });
  });
}

export function deleteFood(item) {
  return new Promise((resolve, reject) => {
    fetch('https://sutoju-logic.eu-gb.mybluemix.net/removeItem', {
      method: 'POST',
      body: JSON.stringify(item),
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
