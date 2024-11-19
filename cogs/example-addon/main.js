const express = require('express');
const router = express.Router();

// Addon metadata
const ADDON_NAME = 'example-addon';
const ADDON_VERSION = '1.0.0';

// Example route
router.get('/addon', (req, res) => {
  res.json({ 
    message: 'Example addon is working!',
    name: ADDON_NAME,
    version: ADDON_VERSION
  });
});

// Example middleware
const exampleMiddleware = (req, res, next) => {
  console.log('Example addon middleware executed');
  next();
};

// Initialize function
const initialize = async () => {
  console.log('Example addon initialized');
};

module.exports = {
  routes: router,
  middleware: [exampleMiddleware],
  initialize
}; 