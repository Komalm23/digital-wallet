const { body, validationResult } = require("express-validator");

// User registration validation
exports.validateRegistration = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters"),
  
  body("email")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address"),
  
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Transaction validation
exports.validateTransaction = [
    body("amount")
        .isFloat({ min: 0.01 })
        .withMessage("Amount must be a positive number"),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];
