let express = require('express');
let cors = require('cors');
let mongoose = require('mongoose');
let urlModule = require('url').URL;
let shortId = require('shortid');
let validUrl = require('valid-url');
let app = express();

app.use(express.static('public'));
app.use(cors({ optionsSuccessStatus: 200 }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Connect DB

mongoose.connect(process.env.MONGO_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000
});
const mongooseConnection = mongoose.connection;
mongooseConnection.once('open', () => console.log('Connected succesfully'));
mongooseConnection.on('error', console.error.bind(console, 'connection error:'));

const { Schema } = mongoose;

const urlSchema = new Schema({
  original_url: String,
  short_url: String
})

const urlModel = mongoose.model("URL", urlSchema);

// Entry Points

app.get('/', (req, res) => res.sendFile(__dirname + '/views/index.html'));

app.post('/api/shorturl/new', async (req, res) => {
  const url = req.body.url;
  const id = shortId.generate();

  if(await !validUrl.isWebUri(url)) {
    res.json({ error: "Invalid URL" });
  } else {
    try {
      // check if url is already in DB & return it
      let inDbAlready = await urlModel.findOne({
        original_url: url
      });
      if(inDbAlready) {
        res.json({
          original_url: inDbAlready.original_url,
          short_url: inDbAlready.short_url
        })
      } else {
      // add url if not already in DB 
        let newUrl = new urlModel({
          original_url: url,
          short_url: id
        });
        await newUrl.save();
        res.json(newUrl);
      }
    } catch(err) {
      console.log(err);
      res.json({
        error: "invalid url"
      })
    }
  }
});

app.get('/api/shorturl/:short_url?', async (req, res) => {
  try {
    const params = await urlModel.findOne({
      short_url: req.params.short_url
    });
    // if matching url found redirect
    if (params) {
      res.redirect(params.original_url);
    } else {
      // report no url found
      res.json({
        error: "invalid url"
      });
    }
  } catch(err) {
    console.log(err);
    res.json({
        error: "invalid url"
      });
  }
})

// Listener

let listener = app.listen(process.env.PORT, () => console.log(`App is listening`));
