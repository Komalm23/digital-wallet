
const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'Digital Wallet',
    description: " a digital wallet system. The platform should allow users to register, deposit/withdraw virtual cash, and transfer funds to other users"
  },    
  host: 'localhost:3000'
};

const outputFile = './swagger-output.json';
const routes = ['./routes/authRoutes.js','./routes/walletRoutes.js', './routes/adminRoutes.js'];

swaggerAutogen(outputFile, routes, doc);