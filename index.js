const express = require('express');
const path = require('path');
// const { engine } = require('express-handlebars');
const { create } = require('express-handlebars');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const session = require('express-session');
const mongoose = require('mongoose');
const passport = require('passport');
require('./config/passport')(passport);
const dbURI = require('./config/db');
const app = express();
const Feature = require('./models/feature');

// Load routes
const general = require('./routes/general');
const media = require('./routes/media');
const tutorials = require('./routes/tutorials');
const groups = require('./routes/groups');
const features = require('./routes/features');
const slides = require('./routes/slides');

// Launch server

const port = process.env.PORT || 4500;
app.listen(port, () => {
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('NODE_ENV:', process.env.dt_db);
  console.log(`Server running on port ${port}...`);
});

// Connect to mongoDB
mongoose
  .connect(dbURI)
  .then(() => console.log('connected to MongoDB...'))
  .catch(err => console.log(err));

// Handlebars helper methods
function jsonOp(obj) {
  return JSON.stringify(obj);
}

function breakWords(str) {
  return str.split(' ').join('<br/>');
}

const hbs = create({ helpers: { jsonOp, breakWords } });

// Handlebars middleware
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.set('views', './views');

// Body-parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
// app.use(express.urlencoded({ extended: true }));

// Method-override middleware
app.use(methodOverride('_method'));

// Express session middleware
app.use(
  session({
    secret: 'crazy-lama',
    resave: false,
    saveUninitialized: true,
  })
);

// Addine authentication to sessions with passport
app.use(passport.initialize());
app.use(passport.session());

// Global variables
app.use((req, res, next) => {
  res.locals.user = req.user || null;

  next();
});

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', general);
app.use('/media', media);
app.use('/tutorials', tutorials);
app.use('/groups', groups);
app.use('/features', features);
app.use('/slides', slides);

// gridfs related imports and operations
const crypto = require('crypto');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const Slide = require('./models/slide');

const conn = mongoose.createConnection(dbURI);

let gfs;
let gridfsBucket;

conn.once('open', () => {
  gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: 'dynamic-tutorials-media',
  });

  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('dynamic-tutorials-media');
});

const storage = new GridFsStorage({
  url: dbURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) return reject(err);

        const filename =
          buf.toString('hex') + '-' + path.basename(file.originalname);

        const fileInfo = {
          filename,
          bucketName: 'dynamic-tutorials-media',
        };

        resolve(fileInfo);
      });
    });
  },
});

const upload = multer({ storage });

app.get('/slide/upload-form', (req, res) => {
  res.render('uploadForm');
});

app.post(
  '/slide/upload-audio/:id',
  upload.single('audio'),
  async (req, res) => {
    const slide = await Slide.findById(req.params.id);
    const feature = await Feature.findById(slide.features[0]);

    if (slide.audioName) {
      await gfs.files.findOne({ filename: slide.audioName }, (err, file) => {
        if (err) return res.send(err);

        if (!file)
          return res.status(404).send('There in no file with the given name');

        gridfsBucket.delete(file._id);
      });

      feature.duration -= slide.duration;
      await feature.save();
    }

    slide.audioName = req.file.filename;
    await slide.save();

    res.send('Success');
  }
);

app.post(
  '/slide/upload-image/:id',
  upload.single('image'),
  async (req, res) => {
    const slide = await Slide.findById(req.params.id);

    if (slide.imageName) {
      await gfs.files.findOne({ filename: slide.imageName }, (err, file) => {
        if (err) return res.send(err);

        if (!file)
          return res.status(404).send('There in no file with the given name');

        gridfsBucket.delete(file._id);
      });
    }

    slide.imageName = req.file.filename;
    await slide.save();

    res.send('Success');
  }
);

app.post(
  '/slide/edited-image/:id',
  upload.single('image'),
  async (req, res) => {
    const slide = await Slide.findById(req.params.id);

    if (slide.editedImageName) {
      await gfs.files.findOne(
        { filename: slide.editedImageName },
        (err, file) => {
          if (err) return res.send(err);

          if (!file)
            return res.status(404).send('There in no file with the given name');

          gridfsBucket.delete(file._id);
        }
      );
    }

    slide.editedImageName = req.file.filename;
    await slide.save();

    res.send('Success');
  }
);

app.get('/slide/image/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    if (!file)
      return res.status(404).send('There is no file with the given filename.');

    const readstream = gridfsBucket.openDownloadStream(file._id);
    readstream.pipe(res);
  });
});

app.get('/slide/audio/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    if (!file)
      return res.status(404).send('There is no file with the given filename.');

    const readstream = gridfsBucket.openDownloadStream(file._id);
    readstream.pipe(res);
  });
});
