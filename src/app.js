const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const schoolsRouter = require('./routes/schools');

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// Health check (optional but useful)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Mount routes
app.use('/', schoolsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// Global error handler (fallback)
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
