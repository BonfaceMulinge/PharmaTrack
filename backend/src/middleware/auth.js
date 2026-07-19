const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { pharmacy: true },
    });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid or inactive user' });
    }

    req.user = user;
    req.pharmacyId = user.pharmacyId;
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

const requireSuperAdmin = (req, res, next) => {
  if (!req.user || !req.user.isSuperAdmin) {
    return res.status(403).json({ message: 'Super Admin access required' });
  }
  next();
};

module.exports = { authenticate, authorize, requireSuperAdmin };
