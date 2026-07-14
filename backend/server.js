const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./src/routes/authRoutes');
const medicineRoutes = require('./src/routes/medicineRoutes');
const supplierRoutes = require('./src/routes/supplierRoutes');
const purchaseRoutes = require('./src/routes/purchaseRoutes');
const saleRoutes = require('./src/routes/saleRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const { authenticate, authorize } = require('./src/middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'PharmaTrack backend is running' });
});

app.get('/api/admin-only', authenticate, authorize('ADMIN'), (_req, res) => {
  res.json({ message: 'Admin access granted' });
});

app.listen(PORT, () => {
  console.log(`PharmaTrack backend listening on port ${PORT}`);
});
