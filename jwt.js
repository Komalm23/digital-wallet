require('dotenv').config()

module.exports = {
  secret: process.env.JWT_SECRET || "your-secret-key",
  expiresIn: process.env.EXPIRY || "5"
};