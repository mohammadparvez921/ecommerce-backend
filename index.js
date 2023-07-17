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
      'MATCH (v:Vendor {email: $email}) RETURN v',
      { email }
    );

    if (emailCheckResult.records.length > 0) {
      session.close();
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Create a new user node in Neo4j
    const result = await session.run(
      'CREATE (v:Vendor {username: $username, password: $password,email:$email}) RETURN v',
      { username, password, email }
    );

    session.close();

    // Return the created user
    res.json(result.records[0].get('v'));
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
      MATCH (v:Vendor {email: $email})
      RETURN v.password = $password AS passwordMatch
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
app.post('/addproducts/:emailid', async (req, res) => {
  const { productName, description, category, price } = req.body;
  const emailid = req.params.emailid;

  try {
    const session = driver.session();

    // Create a new product node in Neo4j
    const result = await session.run(
      // 'CREATE (product:Product {productName: $productName, description: $description, category: $category, price: $price}) RETURN product',
      `
      MATCH (v:Vendor {email: $emailid})
      CREATE (p:Product {productName: $productName, description:$description, category: $category , price: $price})
      CREATE (v)-[:SELLS]->(p)
      RETURN v,p
      `,
      { emailid, productName,description,category,price}
    );

    session.close();

    // Return the created product
    res.json(result.records[0].get('p'));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add product' });
  }
});


// Get all products
app.get('/allproducts/:emailid', async (req, res) => {
  try {
    const session = driver.session();
    const emailid = req.params.emailid;

    const result = await session.run(
      `
      MATCH (v:Vendor {email: $emailid})-[:SELLS]->(p:Product)
      RETURN p
      `,
      { emailid }
    );

    session.close();

    // Map the Neo4j result to JSON format
    const products = result.records.map((record) => record.get('p'));

    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});




// Delete a product by name
app.delete('/deleteproduct', async (req, res) => {
  const { productName } = req.body;

  try {
    const session = driver.session();

    // Delete the product node in Neo4j based on the given product name
     await session.run(
      'MATCH (v)-[s:SELLS]->(p:Product {productName: $productName}) DELETE s, p',
      { productName }
    );

    session.close();

    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});


// Update product endpoint
app.put('/updateproduct/:productName', async (req, res) => {
  const { productName } = req.params;
  const { description, category, price } = req.body;

  try {
    const session = driver.session();

    // Update the product information in Neo4j
    const result = await session.run(
      `
      MATCH (p:Product {productName: $productName})
      SET p.description = $description, p.category = $category, p.price = $price
      RETURN p
      `,
      { productName, description, category, price }
    );

    session.close();

    // Return the updated product
    res.json(result.records[0].get('p'));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update product information' });
  }
});


// Filter products by category endpoint
app.get('/searchproducts/:category', async (req, res) => {
  const { category } = req.params;
    console.log(category);
  try {
    const session = driver.session();

    // Filter products by category in Neo4j
    const result = await session.run(
      `
      MATCH (p:Product {category: $category})
      RETURN p
      `,
      { category }
    );

    session.close();

    // Map the Neo4j result to JSON format
    const products = result.records.map((record) => record.get('p'));

    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});



// code for sorting 
app.get('/sortingproducts/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const session = driver.session();

    // Filter products by email ID of the vendor
    const result = await session.run(
      `
      MATCH (v:Vendor {email: $email})-[:SELLS]->(p:Product)
      RETURN p
      `,
      { email }
    );

    session.close();

    // Map the Neo4j result to JSON format
    const products = result.records.map((record) => record.get('p'));

    // Sort products by price in ascending order
    products.sort((a, b) => a.properties.price - b.properties.price);

    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});




app.listen(3002, function () {
  console.log('Server started');
});

