const jwt = require("jsonwebtoken");
const {secret} = require("../config/jwt");
const User = require("../models/user");

exports.authenticate = async (req,res,next) => {
    try{
        const authHeader = req.headers['authorization'];
        
        if(!authHeader || !authHeader.startsWith("Bearer ")){
            return res.status(401).json({message : "Authentication required"})
        }
        
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token,secret);
        const user = await User.findById(decoded.userId);
        if(!user){
            return res.status(401).json({message: "Invalid Token User not defined"});
        }
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid Token"});
    }
};


exports.isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({ message: "Access denied: Admin role required" });
  }
};
