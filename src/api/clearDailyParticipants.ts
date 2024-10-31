import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";

// Path to the JSON file
const dataPath = path.join(__dirname, "../data/dailyparticipants.json");

// Function to write to the data file
const writeDataFile = (
  data: { participantAddress: string; multiplier: number }[]
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

type ClearParticipantsResponse = { statusCode: number; txn: any };

router.post<{}, ClearParticipantsResponse>(
  "/clear-participants",
  async (req: Request, res: Response) => {
    const { password } = req.body;
    if (password === process.env.MATCH_THREE_MANIA) {
      try {
        await writeDataFile([]);
        res.json({ statusCode: res.statusCode });
      } catch (err) {
        res.status(500).json({ message: "Error clearing participant" });
      }
    } else {
      res.status(500).json({ message: "Error clearing participant" });
    }
  }
);

export default router;
