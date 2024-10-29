import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";

const router = express.Router();

// Path to the leaderboard JSON file
const leaderboardFile = path.join(__dirname, "../data/leaderboard.json");

// Leaderboard entry type
type LeaderboardEntry = {
  name: string;
  score: number;
};

// Load the leaderboard from JSON
const loadLeaderboard = (): LeaderboardEntry[] => {
  try {
    const data = fs.readFileSync(leaderboardFile, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to read leaderboard:", error);
    return [];
  }
};

// Save the leaderboard to JSON
const saveLeaderboard = (data: LeaderboardEntry[]): void => {
  try {
    fs.writeFileSync(leaderboardFile, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to write leaderboard:", error);
  }
};

// GET /leaderboard - Get the current leaderboard
router.get("/leaderboard", (req: Request, res: Response) => {
  const origin = req.get("origin");
  if (origin !== "https://tdldgames.vercel.app") {
    console.log(origin);
    return res.status(403).json();
  }
  const leaderboard = loadLeaderboard();
  res.json(leaderboard);
});

// POST /leaderboard - Add a new entry to the leaderboard
router.post("/leaderboard", (req: Request, res: Response) => {
  const origin = req.get("origin");
  if (origin !== "https://tdldgames.vercel.app") {
    console.log(origin);
    return res.status(403).json();
  }
  const { name, score } = req.body;

  if (!name || typeof score !== "number") {
    return res.status(400).json({ message: "Invalid data provided" });
  }

  // Load the existing leaderboard and add the new entry
  let leaderboard = loadLeaderboard();
  leaderboard.push({ name, score });

  // Sort the leaderboard in descending order and keep the top 10 entries
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, 10);

  // Save the updated leaderboard
  saveLeaderboard(leaderboard);

  res.status(201).json({ message: "Leaderboard updated", leaderboard });
});

// POST /update-leaderboard - Add or update player scores
router.post("/update-leaderboard", (req: Request, res: Response) => {
  const origin = req.get("origin");
  if (origin !== "https://tdldgames.vercel.app") {
    console.log(origin);
    return res.status(403).json();
  }

  const { name, score } = req.body;

  if (!name || typeof score !== "number") {
    return res.status(400).json({ message: "Invalid data" });
  }
  if (!(score >= 100)) {
    return res.status(400).json({ message: "Invalid data" });
  }

  let leaderboard = loadLeaderboard();
  const playerIndex = leaderboard.findIndex((entry) => entry.name === name);

  if (playerIndex >= 0) {
    // Update existing player score if it's higher

    leaderboard[playerIndex].score += score;
  } else {
    // Add new player
    leaderboard.push({ name, score });
  }

  // Sort by score and keep top 10
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, 10);

  saveLeaderboard(leaderboard);
  res.json({ message: "Leaderboard updated", leaderboard });
});

// DELETE /leaderboard - Clear the leaderboard
router.delete("/leaderboard", (req: Request, res: Response) => {
  const origin = req.get("origin");
  if (origin !== "https://tdldgames.vercel.app") {
    console.log(origin);
    return res.status(403).json();
  }
  // Clear the leaderboard by saving an empty array
  saveLeaderboard([]);
  res.json({ message: "Leaderboard cleared" });
});

export default router;
