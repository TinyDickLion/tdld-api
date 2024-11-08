import express, { Request, Response } from "express";
import axios from "axios";
import { sendRewards } from "../algorand/transactionHelpers/sendReward";
import { getAccountBalance } from "../algorand/transactionHelpers/getAccountBalance";
import fs from "fs";
import path from "path";

// Path to the JSON file
const dataPath = path.join(__dirname, "../data/dailyparticipants.json");

// Function to read the data file
const readDataFile = (): Promise<{ participantAddress: string }[]> => {
  return new Promise((resolve, reject) => {
    fs.readFile(dataPath, "utf8", (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(JSON.parse(data));
      }
    });
  });
};

// Function to write to the data file
const writeDataFile = (
  data: { participantAddress: string }[]
): Promise<void> => {
  return new Promise((resolve, reject) => {
    fs.writeFile(dataPath, JSON.stringify(data, null, 2), "utf8", (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

const router = express.Router();

type SendRewardsResponse = { success: boolean; message?: string; txn?: any };

const TDLD_DECIMALS = 1000000;
const API_VESTIGE_URL =
  "https://free-api.vestige.fi/asset/2176744157/price?currency=algo";
const MIN_ALGO_REQUIREMENT = 25; // Minimum ALGO worth of $TDLD to qualify
const HIGH_ALGO_REQUIREMENT = 50; // Higher threshold for double rewards
const DAILY_APY = 0.13 / 100; // 0.13% daily APY

router.post<{}, SendRewardsResponse>(
  "/send-rewards",
  async (req: Request, res: Response) => {
    const origin = req.get("origin");

    // Validate the origin for security
    if (origin !== "https://tdldgames.vercel.app") {
      console.log(`Invalid origin: ${origin}`);
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const { to, score, gameName } = req.body;

    let participants: any = [];

    try {
      participants = await readDataFile();
      const participantIndex = participants.findIndex(
        (p: any) => p.participantAddress === to
      );

      if (participantIndex >= 0) {
        // nothing
        return res.status(429).json({
          success: false,
          message: "You've already claimed your reward for today.",
        });
      }
    } catch (err) {
      res.status(500).json({ message: "Error checking participant" });
    }

    // Check if the score is sufficient to claim rewards
    switch (gameName) {
      case "trivia":
        if (score < 80) {
          return res.status(400).json({
            success: false,
            message:
              "Score is too low to claim rewards. Score must be at least 100.",
          });
        }
        break;
      case "match3mania":
        if (score < 100) {
          return res.status(400).json({
            success: false,
            message:
              "Score is too low to claim rewards. Score must be at least 100.",
          });
        }
        break;
      case "turnBasedBattle":
        if (score < 100) {
          return res.status(400).json({
            success: false,
            message:
              "Please try Again",
          });
        }
        break;
      default:
        break;
    }

    try {
      // Fetch current $TDLD price in ALGO
      const response = await axios.get(API_VESTIGE_URL);
      const tdldPriceInAlgo = response.data.price;

      // Calculate minimum $TDLD required based on ALGO value
      const minTDLDBalance = Math.floor(MIN_ALGO_REQUIREMENT / tdldPriceInAlgo);
      const highTDLDBalance = Math.floor(
        HIGH_ALGO_REQUIREMENT / tdldPriceInAlgo
      );

      // Check user's $TDLD balance
      const accountInfo = await getAccountBalance(to);
      const tdldAsset = accountInfo.assets?.find(
        (asset: any) => asset["asset-id"] === 2176744157
      );

      // Check if the user has sufficient $TDLD balance
      if (!tdldAsset || tdldAsset.amount / TDLD_DECIMALS < minTDLDBalance) {
        return res.json({
          success: false,
          message: `Insufficient $TDLD balance. You need at least ${minTDLDBalance} $TDLD (25 ALGO worth) to claim rewards.`,
        });
      }

      // Calculate daily reward based on holdings and APY
      let rewardAmount = Math.floor(tdldAsset.amount * DAILY_APY);

      // Double the reward if user holds more than 50 ALGO worth of $TDLD
      if (tdldAsset.amount / TDLD_DECIMALS >= highTDLDBalance) {
        rewardAmount *= 2;
      }

      // Send the calculated reward
      const txn = await sendRewards(to, rewardAmount, "2176744157");

      // New participant
      participants.push({ participantAddress: to });
      await writeDataFile(participants);

      // Respond with success message and transaction details
      res.json({
        success: true,
        message: `Reward sent successfully! You received ${
          rewardAmount / TDLD_DECIMALS
        } $TDLD.`,
        txn: txn,
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
