import express, { Request, Response } from "express";
import checkTransactionAmount from "../algorand/transactionHelpers/checkTransactionAmount";

const router = express.Router();

type GetDepositTXResponse = { statusCode: number; txn: any };

router.post<{}, GetDepositTXResponse>(
  "/check-deposit-tx",
  async (req: Request, res: Response) => {
    const origin = req.get("origin");

    if (origin !== "https://tdldgames.vercel.app") {
      console.log(origin);
      return res.status(403).json();
    }

    const { asset, txId } = req.body;
    const expectedAmount = asset === "ALGO" ? 2 * 1000000 : 80 * 100000000; // Adjust amounts based on your logic
    const expectedRecipient =
      "JQONXCP7LYP2O2XQLOPBM6I67LBGCZGEZGHBRRBJBAJEWEIWIRIFZIPXIQ";
    const assetId = asset === "ALGO" ? "0" : "1279721720"; // Adjust asset ID based on your logic

    const checkDeposit = await checkTransactionAmount(
      txId,
      expectedAmount,
      expectedRecipient,
      assetId
    );

    res.json(checkDeposit);
  }
);

export default router;
