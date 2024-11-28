import express, { Request, Response } from "express";
import { db } from "../config/firebase";
import { getLeaderboardCollection } from "../helpers/sendRewards/UpdateLeaderboard";

const router = express.Router();

// GET /leaderboard - Get the current leaderboard
router.get("/leaderboard", async (req: Request, res: Response) => {
  const origin = req.get("origin");
  if (origin !== "https://tdldgames.vercel.app") {
    console.log(origin);
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  try {
    const leaderboardCollection = getLeaderboardCollection();
    const snapshot = await db
      .collection(leaderboardCollection)
      .orderBy("points", "desc")
      .get();

    if (snapshot.empty) {
      return res.status(200).json({ success: true, leaderboard: [] });
    }

    const leaderboard = snapshot.docs.map((doc) => ({
      walletAddress: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({ success: true, leaderboard });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch leaderboard." });
  }
});

export default router;
