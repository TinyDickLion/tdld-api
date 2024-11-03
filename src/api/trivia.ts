import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";

const router = express.Router();

// Path to the trivia questions JSON file
const questionsFile = path.join(__dirname, "../data/questionsData.json");

// Trivia question type
type TriviaQuestion = {
  question: string;
  options: { text: string; isCorrect: boolean }[];
};

// Load trivia questions from JSON
const loadTriviaQuestions = (): TriviaQuestion[] => {
  try {
    const data = fs.readFileSync(questionsFile, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to read trivia questions:", error);
    return [];
  }
};

// GET /trivia - Get the trivia questions data
router.get("/trivia-questions", (req: Request, res: Response) => {
  const origin = req.get("origin");
  if (origin !== "https://tdldgames.vercel.app") {
    console.log(origin);
    return res.status(403).json();
  }

  const triviaQuestions = loadTriviaQuestions();
  res.json(triviaQuestions);
});

export default router;
