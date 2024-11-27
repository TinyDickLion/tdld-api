import express, { Request, Response } from "express";
import { sendRewards } from "../algorand/transactionHelpers/sendReward";
import { getAccountBalance } from "../algorand/transactionHelpers/getAccountBalance";
import path from "path";
import { hasNoRecentInflow } from "../algorand/checkAssetHoldingTime";
import { getRequiredBalance } from "../helpers/sendRewards/getRequiredBalance";
import { calculateRewardAmount } from "../helpers/sendRewards/calculateRewardAmount";
import { tokenDetails, TOKENS } from "../constants/tokendetails";
import { readDataFile, writeDataFile } from "../helpers/readAndwritefiles";
import { db } from "../config/firebase";
import admin from "firebase-admin";

type SendRewardsResponse = { success: boolean; message?: string; txn?: any };

const router = express.Router();

const dataPath = path.join(__dirname, "../data/dailyparticipants.json");

const getLeaderboardCollection = () => {
  const currentDate = new Date();

  // Find the closest Monday
  const day = currentDate.getDay(); // Day of the week (0 = Sunday, 1 = Monday, etc.)
  const daysSinceMonday = day === 0 ? 6 : day - 1; // Days since the last Monday
  const mondayOfThisWeek = new Date(currentDate);
  mondayOfThisWeek.setDate(currentDate.getDate() - daysSinceMonday);

  // Calculate the week number based on Monday
  const weekNumber = Math.floor(
    mondayOfThisWeek.getTime() / (1000 * 60 * 60 * 24 * 7)
  );

  // Return a collection name that reflects the week number
  return `weekly_leaderboard_${weekNumber}`;
};

// Route handler
router.post<{}, SendRewardsResponse>(
  "/send-rewards",
  async (req: Request, res: Response) => {
    const { to, selectedToken } = req.body;

    // Validate origin
    const origin = req.get("origin");
    // if (origin !== "https://tdldgames.vercel.app") {
    //   return res.status(403).json({ success: false, message: "Forbidden" });
    // }

    // Validate token selection
    if (!tokenDetails[selectedToken]) {
      return res
        .status(400)
        .json({ success: false, message: "Unsupported token" });
    }

    const { assetId, rewardAssetID } = tokenDetails[selectedToken];

    try {
      // Check if reward has already been claimed today
      const participants = await readDataFile(dataPath);
      if (participants.some((p: any) => p.participantAddress === to)) {
        return res.status(429).json({
          success: false,
          message: "You've already claimed your reward for today.",
        });
      }

      // Determine required balance
      const requiredBalance = await getRequiredBalance(
        tokenDetails,
        selectedToken,
        assetId
      );

      // Get account balance and token holdings
      const accountInfo = await getAccountBalance(to);
      const asset = accountInfo.assets?.find(
        (asset: any) => asset["asset-id"] === assetId
      );
      const heldAmount = asset ? asset.amount / 1000000 : 0;

      // Check eligibility based on holdings
      if (requiredBalance === undefined || heldAmount < requiredBalance) {
        return res.status(400).json({
          success: false,
          message: `Insufficient balance to claim rewards.`,
        });
      }

      // Calculate reward amount
      const rewardAmount = await calculateRewardAmount(
        tokenDetails,
        selectedToken,
        heldAmount
      );

      // Check holding time and inflow restrictions
      const hasHeld = await hasNoRecentInflow(to, assetId);
      if (!hasHeld) {
        const ineligibilityMessage = `Not eligible. To claim the reward, you must hold the token continuously in your wallet for at least 16 hours without any recent incoming token transfers.`;
        return res
          .status(400)
          .json({ success: false, message: ineligibilityMessage });
      }

      // Update leaderboard
      const leaderboardCollection = getLeaderboardCollection();
      const userRef = db.collection(leaderboardCollection).doc(to);

      const userDoc = await userRef.get();

      if (userDoc.exists) {
        await userRef.update({
          points: admin.firestore.FieldValue.increment(10),
          updates: admin.firestore.FieldValue.arrayUnion(
            new Date().toISOString()
          ),
        });
      } else {
        await userRef.set({
          walletAddress: to,
          points: 10,
          updates: [new Date().toISOString()],
        });
      }

      // Send reward in test mode
      res.json({
        success: true,
        message: `TestMode: Reward sent successfully! You received ${rewardAmount.toFixed(
          2
        )} $${selectedToken.toUpperCase()}.`,
        txn: null,
      });

      // send actual reward and record participant
      // const txn = await sendRewards(
      //   to,
      //   selectedToken !== TOKENS.REAR
      //     ? Number(rewardAmount.toFixed(2)) * 1000000
      //     : Number(rewardAmount.toFixed(2)) * 100000000,
      //   rewardAssetID
      // );
      // participants.push({ participantAddress: to });
      // await writeDataFile(dataPath, participants);
      // res.json({
      //   success: true,
      //   message: `Reward sent successfully! You received ${rewardAmount.toFixed(
      //     2
      //   )} $${selectedToken.toUpperCase()}.`,
      //   txn,
      // });
      // console.log("Reward sent successfully:", txn);
    } catch (error) {
      console.error("Error processing reward claim:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process reward claim. Please try again.",
      });
    }
  }
);

export default router;
