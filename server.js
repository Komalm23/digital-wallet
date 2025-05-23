let app = require("./app");
require("dotenv").config();
let mongoose = require("mongoose");
const dbConnection = require("./config/database");

mongoose.connect(dbConnection).then(()=> {
    console.log("Connected to MongoDB");
    const PORT = process.env.PORT || 3000;
    app.listen(PORT,() => {
        console.log("Server is running on  port "+PORT);
    })
})
.catch(err => {
    console.error("Failed to connect to MongoDB",err);
    process.exit(1);
});