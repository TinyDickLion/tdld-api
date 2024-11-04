import express, { Request, Response } from "express";
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

// Endpoint to clear participants
router.post<{}, ClearParticipantsResponse>(
  "/clear-participants",
  async (req: Request, res: Response) => {
    const { password } = req.body;
    if (password === process.env.MATCH_THREE_MANIA) {
      try {
        await writeDataFile([]);
        res.json({ statusCode: res.statusCode });
      } catch (err) {
        res.status(500).json({ message: "Error clearing participants" });
      }
    } else {
      res.status(403).json({ message: "Unauthorized action" });
    }
  }
);

// endpoint to get all current participants
router.post("/get-participants", async (req: Request, res: Response) => {
  const { password } = req.body;
  if (password === process.env.MATCH_THREE_MANIA) {
    try {
      const participants = await readDataFile();
      res.json(participants);
    } catch (err) {
      res.status(500).json({ message: "Error retrieving participants" });
    }
  } else {
    res.status(403).json({ message: "Unauthorized action" });
  }
});

export default router;
