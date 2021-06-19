const constants = require('../constants');

const express = require('express');
const router = express.Router();

const logger = require('pino')({
  prettyPrint: { translateTime: 'SYS:standard', ignore: 'hostname,pid' },
});

const cors = require('cors');

const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://localhost:27017/';

const initDatabase = () => {
  const client = new MongoClient(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  client
    .connect()
    .then(() => {
      logger.info('Successfully connect to MongoDB!');
    })
    .catch(() => {
      logger.fatal('Failed to connect to MongoDB');
    });

  const database = client.db('coutts');
  constants.EXHIBITIONS.forEach((exhibition) => {
    const ticket = database.collection(exhibition);
    ticket.indexes().then(async (res) => {
      if (!res.find((object) => object.name.includes('ticketNumber'))) {
        await ticket.createIndex({ ticketNumber: 1 }, { unique: true });
        logger.info(
          `${exhibition} ticket number is not unique, creating a index...`
        );
      }
    });
  });

  return database;
};

const database = initDatabase();

router.use(cors({
  origin: constants.CROSSORIGIN,
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}))


router.post('/auth', (req,res) => {
  if (req.body.password === constants.PASSWORD) {
    res.json({token:constants.TOKEN});
  } else {
    res.status(403).json("Permission denied")}
})


router.use((req, res, next) => {
  if (req.get('Authorization') === constants.TOKEN) {
    next();
  } else {
    logger.warn(`Unauthorized request from ${req.ip}`);
    res.status(403).json('Permission denied');
  }
});

router.use((req, res, next) => {
  if (req.method === 'GET') {
    const { exhibition } = req.query;
    if (!constants.EXHIBITIONS.includes(exhibition)) {
      res.status(404).json('Exhibition not specified or not found');
    } else {
      next();
    }
  } else if (
    req.method === 'POST' ||
    req.method === 'PATCH' ||
    req.method === 'DELETE'
  ) {
    const { exhibition } = req.body;
    if (!constants.EXHIBITIONS.includes(exhibition)) {
      res.status(404).json('Exhibition not specified or not found');
    } else {
      next();
    }
  } else {
    next();
  }
});

router.post('/ticket', (req, res) => {
  const { exhibition, ...document } = req.body;
  const ticket = database.collection(exhibition);
  ticket
    .insertOne({ ...document,exhibition })
    .then(() => res.status(200).json('Success'))
    .catch((error) => {
      res.status(409).json('This ticket number has already been used');
      logger.error(error);
    });
});

router.post('/tickets', (req, res) => {
  const { exhibition, documents } = req.body;
  const ticket = database.collection(exhibition);
  ticket
    .insertMany(documents, { ordered: true })
    .then(() => res.status(200).json('Success'))
    .catch((error) => {
      res
        .status(409)
        .json('Some ticket number has already been used, partly inserted.');
      logger.error(error);
    });
});

router.get('/tickets', (req, res) => {
  const { exhibition } = req.query;
  console.log(exhibition);
  const ticket = database.collection(exhibition);
  ticket
    .find()
    .toArray()
    .then((tickets) => {
      res.json(tickets);
    })
    .catch((error) => {
      logger.fatal(error);
      res.status(500).json('Internal server error');
    });
});

router.patch('/ticket/status', (req, res) => {
  const { exhibition } = req.body;
  const ticket = database.collection(exhibition);
  ticket
    .updateOne(
      { ticketNumber: req.body.ticketNumber },
      { $set: { verified: req.body.verified } }
    )
    .then(() => {
      res.json('Success');
    })
    .catch((error) => {
      logger.fatal(error);
      res.status(500).json('Internal server error');
    });
});

router.delete('/ticket', (req, res) => {
  const { exhibition, ticketNumber } = req.body;
  const ticket = database.collection(exhibition);
  ticket
    .deleteOne({
      ticketNumber,
    })
    .then((result) => {
      if (result.deletedCount === 1) {
        res.json('Success');
      } else {
        throw new TypeError('Request body error');
      }
    })
    .catch((error) => {
      logger.fatal(error);
      res.status(500).json('Internal server error');
    });
});

router.delete('/tickets', (req, res) => {
  const { exhibition, ticketNumbers } = req.body;
  const ticket = database.collection(exhibition);
  ticket
    .deleteMany({
      ticketNumber: { $in: ticketNumbers },
    })
    .then((result) => {
      res.json('Success');
    })
    .catch((error) => {
      logger.fatal(error);
      res.status(500).json('Internal server error');
    });
});

module.exports = router;
