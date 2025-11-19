export const isSuperAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No user data found."
      });
    }

    if (req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Super Admin only."
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Super admin authorization failed",
      error: err.message
    });
  }
};
