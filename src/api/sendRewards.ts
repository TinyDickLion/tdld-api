import express, { Request, Response } from "express";
import { sendRewards } from "../algorand/transactionHelpers/sendReward";

const router = express.Router();

type SendRewardsResponse = { statusCode: number; txn: any };

router.post<{}, SendRewardsResponse>(
  "/send-rewards",
  async (req: Request, res: Response) => {
    const origin = req.get("origin");

    if (origin !== "https://tdldgamer.vercel.app") {
      console.log(origin);
      return res.status(403).json();
    }

    const { to, score } = req.body;

    if (score >= 100) {
      const txn = await sendRewards(to, 1 * 100000000, "2176744157");

      res.json({ statusCode: res.statusCode, txn: txn });
    } else {
      res.json({ statusCode: 404, txn: "Wrong score" });
    }
  }
);

export default router;
