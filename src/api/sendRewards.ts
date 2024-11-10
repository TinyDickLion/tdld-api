import express, { Request, Response } from "express";
import axios from "axios";
import { sendRewards } from "../algorand/transactionHelpers/sendReward";
import { getAccountBalance } from "../algorand/transactionHelpers/getAccountBalance";
import fs from "fs";
import path from "path";
import { hasNoRecentInflow } from "../algorand/checkAssetHoldingTime";

const router = express.Router();

type SendRewardsResponse = { success: boolean; message?: string; txn?: any };

// Define token details
const tokenDetails: any = {
  tdld: { assetId: 2176744157, minAlgoValue: 25, rewardPercent: 0.13 },
};

// Path to the JSON file for daily participants
const dataPath = path.join(__dirname, "../data/dailyparticipants.json");
const readDataFile = async () =>
  JSON.parse((await fs.promises.readFile(dataPath, "utf8")) || "[]");
const writeDataFile = async (data: any) =>
  fs.promises.writeFile(dataPath, JSON.stringify(data, null, 2), "utf8");

router.post<{}, SendRewardsResponse>(
  "/send-rewards",
  async (req: Request, res: Response) => {
    const { to, score, gameName, selectedToken } = req.body;

    // Validate origin
    const origin = req.get("origin");
    if (origin !== "https://tdldgames.vercel.app") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    // Validate token selection
    if (!tokenDetails[selectedToken]) {
      return res
        .status(400)
        .json({ success: false, message: "Unsupported token" });
    }

    const { assetId, minAlgoValue, rewardPercent } =
      tokenDetails[selectedToken];
    const API_VESTIGE_URL = `https://free-api.vestige.fi/asset/${assetId}/price?currency=algo`;

    // Score validation based on game
    const requiredScore =
      gameName === "match3mania" || gameName === "turnBasedBattle" ? 100 : 80;
    if (score < requiredScore) {
      return res.status(400).json({
        success: false,
        message: "Score is too low to claim rewards.",
      });
    }

    try {
      // Ensure the user hasn't already claimed rewards today
      const participants = await readDataFile();
      if (participants.find((p: any) => p.participantAddress === to)) {
        return res.status(429).json({
          success: false,
          message: "You've already claimed your reward for today.",
        });
      }

      // Fetch token price in ALGO and calculate minimum balance
      const { data: priceData } = await axios.get(API_VESTIGE_URL);
      const tokenPriceInAlgo = priceData.price;
      const requiredBalance = Math.floor(minAlgoValue / tokenPriceInAlgo);

      // Get account balance and token holdings
      const accountInfo = await getAccountBalance(to);
      const asset = accountInfo.assets?.find(
        (asset: any) => asset["asset-id"] === assetId
      );
      const heldAmount = asset ? asset.amount / 1000000 : 0;

      // Check eligibility based on holdings
      if (heldAmount < requiredBalance) {
        return res.status(400).json({
          success: false,
          message: `Insufficient ${selectedToken.toUpperCase()} balance to claim rewards.`,
        });
      }

      // Calculate reward based on held amount
      const rewardAmount = Math.floor((heldAmount * rewardPercent) / 100);

      const hasHeld = await hasNoRecentInflow(to, assetId);
      if (hasHeld === false) {
        return res.status(400).json({
          success: false,
          message: `Not eligible. To claim the reward, you must hold ${selectedToken.toUpperCase()} continuously in your wallet for at least 12 hours without any recent incoming transfers.`,
        });
      }

      // Send the reward
      const txn = await sendRewards(
        to,
        rewardAmount * 1000000,
        assetId.toString()
      );

      // Add to daily participants
      participants.push({ participantAddress: to });
      await writeDataFile(participants);

      res.json({
        success: true,
        message: `Reward sent successfully! You received ${rewardAmount} ${selectedToken.toUpperCase()}.`,
        txn,
      });
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
