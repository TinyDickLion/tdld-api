import express, { Request, Response } from "express";
import axios from "axios";
import { sendRewards } from "../algorand/transactionHelpers/sendReward";
import { getAccountBalance } from "../algorand/transactionHelpers/getAccountBalance";
import fs from "fs";
import path from "path";
import { hasNoRecentInflow } from "../algorand/checkAssetHoldingTime";

const router = express.Router();

type SendRewardsResponse = { success: boolean; message?: string; txn?: any };

const REWARD_GIVER_ADDRESS =
  "TOAQFF5LSU43LKGAKUQUPYA4XQRJJTLMCROCQGJSACSD3UVEDBXBHWNKNM";

// Token configuration
const tokenDetails: Record<string, any> = {
  tdld: {
    assetId: 2176744157,
    rewardAssetID: 2176744157,
    minAlgoValue: 25,
    rewardPercent: 0.13,
  },
  bwom: {
    assetId: 2328010867,
    rewardAssetID: 2327984798,
    minBwomLPValue: 6.9,
    rewardPercent: 6.9,
  },
};

const bwomStartDate = new Date("2024-11-14");
const dataPath = path.join(__dirname, "../data/dailyparticipants.json");

// Utility Functions
const readDataFile = async () =>
  JSON.parse((await fs.promises.readFile(dataPath, "utf8")) || "[]");
const writeDataFile = async (data: any) =>
  fs.promises.writeFile(dataPath, JSON.stringify(data, null, 2), "utf8");

const calculateDynamicBwomRewardPercent = () => {
  const daysSinceStart = Math.floor(
    (Date.now() - bwomStartDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const reductions = Math.floor(daysSinceStart / 2);
  return Math.max(0, tokenDetails.bwom.rewardPercent - reductions * 0.46);
};

const getRequiredBalance = async (selectedToken: string, assetId: number) => {
  if (selectedToken === "tdld") {
    const API_VESTIGE_URL = `https://free-api.vestige.fi/asset/${assetId}/price?currency=algo`;
    const { data: priceData } = await axios.get(API_VESTIGE_URL);
    return Math.floor(
      tokenDetails[selectedToken].minAlgoValue / priceData.price
    );
  }
  return tokenDetails[selectedToken].minBwomLPValue;
};

const calculateRewardAmount = async (
  selectedToken: string,
  heldAmount: number
) => {
  if (selectedToken === "tdld") {
    return (heldAmount * tokenDetails[selectedToken].rewardPercent) / 100;
  }

  const rewardProviderInfo = await getAccountBalance(REWARD_GIVER_ADDRESS);
  const rewardProviderAsset = rewardProviderInfo.assets?.find(
    (asset: any) =>
      asset["asset-id"] === tokenDetails[selectedToken].rewardAssetID
  );
  const providerHoldings = rewardProviderAsset
    ? rewardProviderAsset.amount / 1000000
    : 0;
  const bwomRewardPercent = calculateDynamicBwomRewardPercent();
  return (providerHoldings * bwomRewardPercent) / 100;
};

// Route handler
router.post<{}, SendRewardsResponse>(
  "/send-rewards",
  async (req: Request, res: Response) => {
    const { to, selectedToken } = req.body;

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

    const { assetId, rewardAssetID } = tokenDetails[selectedToken];

    try {
      // Check if reward has already been claimed today
      const participants = await readDataFile();
      if (participants.some((p: any) => p.participantAddress === to)) {
        return res.status(429).json({
          success: false,
          message: "You've already claimed your reward for today.",
        });
      }

      // Determine required balance
      const requiredBalance = await getRequiredBalance(selectedToken, assetId);

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

      // Calculate reward amount
      const rewardAmount = await calculateRewardAmount(
        selectedToken,
        heldAmount
      );

      // Check holding time and inflow restrictions
      const hasHeld = await hasNoRecentInflow(to, assetId);
      if (!hasHeld) {
        const ineligibilityMessage = `Not eligible. To claim the reward, you must hold ${selectedToken.toUpperCase()} continuously in your wallet for at least 12 hours without any recent incoming token transfers.`;
        return res
          .status(400)
          .json({ success: false, message: ineligibilityMessage });
      }

      // Send reward in test mode
      // res.json({
      //   success: true,
      //   message: `TestMode: Reward sent successfully! You received ${rewardAmount.toFixed(
      //     2
      //   )} ${selectedToken.toUpperCase()}.`,
      //   txn: null,
      // });

      // send actual reward and record participant
      const txn = await sendRewards(
        to,
        Number(rewardAmount.toFixed(2)) * 1000000,
        rewardAssetID
      );
      participants.push({ participantAddress: to });
      await writeDataFile(participants);
      res.json({
        success: true,
        message: `Reward sent successfully! You received ${rewardAmount.toFixed(
          2
        )} ${selectedToken.toUpperCase()}.`,
        txn,
      });
      console.log("Reward sent successfully:", txn);
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
