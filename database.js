require('dotenv').config()
let dbConnection = process.env.MONGO_URI || "mongodb://localhost:27017/digital-wallet"

module.exports = dbConnection;