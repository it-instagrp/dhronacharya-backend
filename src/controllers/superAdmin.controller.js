import db from '../models/index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Op } from "sequelize";   // <-- Correct import

const { User, Admin } = db;

/* -----------------------------------------
   SUPER ADMIN SIGNUP  (Only first time)
------------------------------------------ */
export const superAdminSignup = async (req, res) => {
  try {
    const { name, email, mobile_number, password } = req.body;

    const existed = await User.findOne({ where: { email } });
    if (existed) {
      return res.status(400).json({
        message: "Super admin already exists with this email"
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      mobile_number,
      password_hash: hash,
      role: "super_admin",
      is_active: true
    });

    return res.status(201).json({
      message: "Super Admin created successfully",
      user
    });

  } catch (err) {
    return res.status(500).json({
      message: "Failed to create super admin",
      error: err.message
    });
  }
};


/* -----------------------------------------
   CREATE ADMIN (Only Super Admin)
------------------------------------------ */
export const createAdmin = async (req, res) => {
  try {
    const { name, email, mobile_number, password } = req.body;

    const existed = await User.findOne({ where: { email } });
    if (existed) return res.status(400).json({ message: "Email already exists" });

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      mobile_number,
      password_hash: hash,
      role: "admin",
      is_active: true
    });

    // FIX → Admin needs a name
    await Admin.create({
      user_id: user.id,
      name: name
    });

    return res.status(201).json({
      message: "Admin created successfully",
      user
    });

  } catch (err) {
    console.log("Admin Create Error →", err);
    return res.status(500).json({ error: err.message });
  }
};



/* -----------------------------------------
   GET ALL ADMINS (Only Super Admin)
------------------------------------------ */
export const getAllAdmins = async (req, res) => {
  try {
    const admins = await User.findAll({
      where: { role: "admin" },
      attributes: ["id", "name", "email", "mobile_number", "created_at"]
    });

    return res.json({ admins });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


/* -----------------------------------------
   DELETE ADMIN (Only Super Admin)
------------------------------------------ */
export const deleteAdmin = async (req, res) => {
  try {
    const { admin_id } = req.params;

    const user = await User.findByPk(admin_id);

    if (!user || user.role !== "admin") {
      return res.status(404).json({ message: "Admin not found" });
    }

    await Admin.destroy({ where: { user_id: admin_id } });
    await User.destroy({ where: { id: admin_id } });

    return res.json({ message: "Admin deleted successfully" });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


/* -----------------------------------------
   SUPER ADMIN LOGIN
------------------------------------------ */
export const superAdminLogin = async (req, res) => {
  try {
    const { emailOrMobile, password } = req.body;

    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: emailOrMobile },
          { mobile_number: emailOrMobile }
        ]
      }
    });

    if (!user || user.role !== "super_admin") {
      return res.status(401).json({ message: "Invalid Super Admin credentials" });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Super Admin login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
