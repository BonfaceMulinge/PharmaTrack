const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./src/routes/authRoutes');
const medicineRoutes = require('./src/routes/medicineRoutes');
const saleRoutes = require('./src/routes/saleRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const userRoutes = require('./src/routes/userRoutes');
const superAdminRoutes = require('./src/routes/superAdminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/super-admin', superAdminRoutes);

app.get('/health', async (_req, res) => {
  try {
    const prisma = require('./src/utils/prisma');
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'error', db: 'disconnected', message: error.message });
  }
});

app.use((_req, res) => {
  res.status(404).json({ message: 'Not found' });
});

app.use((err, _req, res, _next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`PharmaTrack backend listening on port ${PORT}`);
});
