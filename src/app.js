const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const dotenv = require('dotenv');
const mysql = require('mysql2'); // or 'mysql'

dotenv.config();

const app = express();
const schoolsRouter = require('./routes/schools');

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Mount routes
app.use('/', schoolsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

// MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,       // e.g., aiven-host.aivencloud.com
  user: process.env.DB_USER,       // your DB username
  password: process.env.DB_PASSWORD, // your DB password
  database: process.env.DB_NAME,   // your DB name
  port: process.env.DB_PORT || 3306
});

db.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Database connected successfully');
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
