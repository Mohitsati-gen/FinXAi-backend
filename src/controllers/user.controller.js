import User from "../models/user.model.js";

// GET /api/user
export const getCurrentUser = async (req, res) => {
  try {
    const auth = req.auth();
const clerkUserId = auth?.userId;

    if (!clerkUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findOne({ clerkUserId });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });

  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ message: error.message });
  }
};