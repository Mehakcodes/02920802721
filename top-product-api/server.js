const access_token= "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiZXhwIjoxNzIwMTY1MjEzLCJpYXQiOjE3MjAxNjQ5MTMsImlzcyI6IkFmZm9yZG1lZCIsImp0aSI6IjZmNjZhZjA2LTA5MzEtNDI4YS1hNTAxLWI3NjgwMDU5NDM1OCIsInN1YiI6Im1laGFrcmpwbDgwQGdtYWlsLmNvbSJ9LCJjb21wYW55TmFtZSI6IkJoYWd3YW4gUGFyc2h1cmFtIEluc3RpdHV0ZSBvZiBUZWNobm9sb2d5IiwiY2xpZW50SUQiOiI2ZjY2YWYwNi0wOTMxLTQyOGEtYTUwMS1iNzY4MDA1OTQzNTgiLCJjbGllbnRTZWNyZXQiOiJRSGJFWHhOcXBoa0FKU2ZaIiwib3duZXJOYW1lIjoiTWVoYWsgUmFqcGFsIiwib3duZXJFbWFpbCI6Im1laGFrcmpwbDgwQGdtYWlsLmNvbSIsInJvbGxObyI6IjAyOTIwODAyNzIxIn0.9aufv-H2MNUuZd89JTgzVJTLy2DTeq-YfjmO492-FbY";
const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3000;

app.use(express.json());
axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

const eComAPIs = {
  AMZ: 'http://20.244.56.144/test/companies/AMZ/categories',
  FLP: 'http://20.244.56.144/test/companies/FLP/categories',
  SNP: 'http://20.244.56.144/test/companies/SNP/categories',
  MYN: 'http://20.244.56.144/test/companies/MYN/categories',
  AZO: 'http://20.244.56.144/test/companies/AZO/categories'
};

// Cache to store fetched products
let cachedProducts = {};
let cachedCategory = '';
let cachedMinPrice = 0;
let cachedMaxPrice = Infinity;

// Utility function to fetch data from all e-commerce APIs
const fetchProducts = async (category, minPrice, maxPrice, top) => {
  const promises = Object.keys(eComAPIs).map(company => 
    axios.get(`${eComAPIs[company]}/${category}/products?top=${top}&minPrice=${minPrice}&maxPrice=${maxPrice}`)
  );
  const responses = await Promise.all(promises);
  return responses.flatMap(response => response.data);
};

// Generate a custom unique identifier for each product
const generateUniqueId = (product, i) => `${i}-${product.productName}`;

// GET /categories/:categoryname/products
app.get('/categories/:categoryname/products', async (req, res) => {
  try {
    const { categoryname } = req.params;
    let { top = 10, page = 1, sort = 'price', order = 'asc', minPrice = 0, maxPrice = Infinity } = req.query;

    n = parseInt(top);
    page = parseInt(page);

    // Check if the category, minPrice, and maxPrice match the cache
    if (categoryname !== cachedCategory || minPrice !== cachedMinPrice || maxPrice !== cachedMaxPrice) {
      cachedProducts = await fetchProducts(categoryname, minPrice, maxPrice, n);
      cachedCategory = categoryname;
      cachedMinPrice = minPrice;
      cachedMaxPrice = maxPrice;
    }

    // Sorting
    cachedProducts.sort((a, b) => {
      if (order === 'asc') {
        return a[sort] - b[sort];
      } else {
        return b[sort] - a[sort];
      }
    });

    // Pagination logic if n > 10
    if (n > 10) {
      const startIndex = (page - 1) * 10;
      const endIndex = startIndex + 10;
      const paginatedProducts = cachedProducts.slice(startIndex, endIndex);

      // Adding unique identifiers
      const result = paginatedProducts.map((product, index) => ({
        ...product,
        unique_id: generateUniqueId(product, Object.keys(eComAPIs)[index % Object.keys(eComAPIs).length])
      }));

      res.json(result);
    } else {
      // Adding unique identifiers
      const result = cachedProducts.map((product, index) => ({
        ...product,
        unique_id: generateUniqueId(product, index )
      }));

      res.json(result);
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /categories/:categoryname/products/:productid
app.get('/categories/:categoryname/products/:productid', async (req, res) => {
  try {
    const { categoryname, productid } = req.params;

    const product = cachedProducts.find(p => generateUniqueId(p,cachedProducts.indexOf(p)));

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});