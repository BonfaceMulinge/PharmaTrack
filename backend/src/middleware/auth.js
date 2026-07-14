const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

const demoUser = { id: 'demo-user', role: 'ADMIN', isActive: true };
const allowDemoAuth = process.env.NODE_ENV !== 'production';

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (allowDemoAuth) {
        req.user = demoUser;
        return next();
      }
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    if (allowDemoAuth && token === (process.env.DEMO_TOKEN || 'demo-token')) {
      req.user = demoUser;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid or inactive user' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    next();
  };
};

module.exports = { authenticate, authorize };
