var express = require('express');
var path = require('path')
var logger = require('morgan')
var bodyParser = require('body-parser');
var neo4j = require('neo4j-driver');
const cors = require("cors");

const app = express();

// app.use(cors());
app.use(cors(

  {
    origin: "http://localhost:3000",
    credentials: true,
  }
))
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', "http://localhost:3000");
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


// signup endpoint

app.post('/signup', async (req, res) => {
  const { username, password, email } = req.body;

  try {
    const session = driver.session();


    const emailCheckResult = await session.run(
      'MATCH (user:User {email: $email}) RETURN user',
      { email }
    );

    if (emailCheckResult.records.length > 0) {
      session.close();
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Create a new user node in Neo4j
    const result = await session.run(
      'CREATE (user:User {username: $username, password: $password,email:$email}) RETURN user',
      { username, password, email }
    );

    session.close();

    // Return the created user
    res.json(result.records[0].get('user'));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to signup' });
  }
});


// login endpoit
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const session = driver.session();

    // Check if user exists and password matches
    const result = await session.run(
      `
      MATCH (user:User {email: $email})
      RETURN user.password = $password AS passwordMatch
      `,
      {
        email,
        password,
      }
    );

    session.close();

    if (result.records[0].get('passwordMatch')) {
      // Authentication successful
      res.json({ success: true });
    } else {
      // Authentication failed
      res.json({ success: false, error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to login' });
  }
});



// Add product endpoint
app.post('/products', async (req, res) => {
  const { productName, description, category, price } = req.body;

  try {
    const session = driver.session();

    // Create a new product node in Neo4j
    const result = await session.run(
      'CREATE (product:Product {productName: $productName, description: $description, category: $category, price: $price}) RETURN product',
      { productName, description, category, price }
    );

    session.close();

    // Return the created product
    res.json(result.records[0].get('product'));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add product' });
  }
});


// Get all products
app.get('/allproducts', async (req, res) => {
  try {
    const session = driver.session();


    const result = await session.run('MATCH (product:Product) RETURN product');

    session.close();

    // Map the Neo4j result to JSON format
    const products = result.records.map((record) => record.get('product').properties);

    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Delete a product
app.delete('/products/:id', async (req, res) => {
  const productId = req.params.id;

  try {
    const session = driver.session();

    // Delete the product node in Neo4j based on the given ID
    await session.run('MATCH (product:Product {id: $productId}) DELETE product', { productId });

    session.close();

    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});


// Delete a product by name
app.delete('/deleteproduct', async (req, res) => {
  const { productName } = req.body;

  try {
    const session = driver.session();

    // Delete the product node in Neo4j based on the given product name
    await session.run('MATCH (product:Product {productName: $productName}) DELETE product', { productName });

    session.close();

    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});



// Get product by name
app.get('/products/:productName', async (req, res) => {
  const productName = req.params.productName;

  try {
    const session = driver.session();

    const result = await session.run(
      'MATCH (p:Product {productName: $productName}) RETURN p',
      { productName }
    );

    session.close();

    if (result.records.length === 0) {
      res.status(404).json({ error: 'Product not found' });
    } else {
      const product = result.records[0].get('p').properties;
      res.json(product);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});


app.listen(3002, function () {
  console.log('Server started');
});

