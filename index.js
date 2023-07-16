var express = require('express');
var path = require('path')
var logger = require('morgan')
var bodyParser = require('body-parser');
var neo4j = require('neo4j-driver');
const cors = require("cors");

const app = express();

// app.use(cors());
app.use(cors (
  
  {origin:"http://localhost:3000",
  credentials:true,
  }
))
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin',"http://localhost:3000");
  res.header('Access-Control-Allow-Headers', '*');

  next();
});

// view engine

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs')


app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));




const URI = 'neo4j+s://eae0bb97.databases.neo4j.io'
const USER = 'neo4j'
const PASSWORD = 'eX3JEFwMs87S8xDBD8BhAMlmDMpQUjX7DUYZubnFNZc'
let driver


(async () => {


  try {
    driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD))
    const serverInfo = await driver.getServerInfo()
    console.log('Connection established')
    console.log(serverInfo)

  } catch (err) {
    console.log(`Connection error\n${err}\nCause: ${err.cause}`)
  }
})();


app.post('/signup', async (req, res) => {
  const { username, password } = req.body;

  try {
    const session = driver.session();

    // Create a new user node in Neo4j
    const result = await session.run(
      'CREATE (user:User {username: $username, password: $password}) RETURN user',
      { username, password }
    );

    session.close();

    // Return the created user
    res.json(result.records[0].get('user'));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to signup' });
  }
});

app.get("/message", (req, res) => {

  res.status(200).send({ message: "Hello from server!" });
});

app.listen(3002, function () {
  console.log('Server started');
});

