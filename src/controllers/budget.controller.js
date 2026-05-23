import Budget from "../models/budget.model.js";
 
// GET /api/budget — get current user's budget
export const getBudget = async (req, res) => {
  try {
    const { userId } = req.auth();
 
    const budget = await Budget.findOne({ clerkUserId: userId });
 
    return res.status(200).json({
      success: true,
      data:    budget || null,
    });
  } catch (error) {
     return res.status(500).json({ success: false, message: error.message });
  }
};
 
// POST /api/budget — create or update budget
export const upsertBudget = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { amount } = req.body;
 
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid budget amount",
      });
    }
 
    // upsert — create if not exists, update if exists
    const budget = await Budget.findOneAndUpdate(
      { clerkUserId: userId },          // find by this
      { clerkUserId: userId, amount },  // update with this
      { upsert: true, returnDocument: 'after'  }       // create if not found, return new doc
    );
 
    return res.status(200).json({
      success: true,
      message: "Budget saved successfully",
      data:    budget,
    });
  } catch (error) {
     return res.status(500).json({ success: false, message: error.message });
  }
};
 