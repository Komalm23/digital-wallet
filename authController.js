// Controller files
// controllers/authController.js
const User = require("../models/user");
const Wallet = require("../models/wallet");
const jwt = require("jsonwebtoken");
const { secret, expiresIn } = require("../config/jwt");

exports.register = async (req, res) => {
  try {
    const { username, email, password, role} = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }]
    });
    
    if (existingUser) {
      return res.status(409).json({ 
        message: "Username or email already exists" 
      });
    }
    
    // Create new user
    const user = new User({
      username,
      email,
      password,
      role
    });
    
    await user.save();
    
    // Create wallet for the new user
    const wallet = new Wallet({
      userId: user._id,
      balance: 0
    });
    
    await wallet.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      secret,
      { expiresIn }
    );
    
    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Registration failed", error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      secret,
      { expiresIn }
    );

    
    res.json({
      message: "Login successful",
      Authorization_string:"Bearer "+token,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};