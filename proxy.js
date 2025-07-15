const express = require('express');
const sql = require('mssql');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// SQL Server configuration
const config = {
  server: process.env.SQL_SERVER_HOST,
  port: parseInt(process.env.SQL_SERVER_PORT),
  database: process.env.SQL_SERVER_DATABASE,
  user: process.env.SQL_SERVER_USER,
  password: process.env.SQL_SERVER_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

// API Key middleware
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.SQL_PROXY_API_KEYY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.use(authenticateApiKey);

// Generic query endpoint
app.post('/query', async (req, res) => {
  try {
    const { query, params = [] } = req.body;
    
    const pool = await sql.connect(config);
    const request = pool.request();
    
    // Add parameters
    params.forEach((param, index) => {
      request.input(`param${index}`, param);
    });
    
    const result = await request.query(query);
    await pool.close();
    
    res.json({
      success: true,
      data: result.recordset,
      rowsAffected: result.rowsAffected
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
app.listen(port, () => {
  console.log(`SQL Server proxy running on port ${port}`);
});