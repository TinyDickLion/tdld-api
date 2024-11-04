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

// Utility to shuffle an array
const shuffleArray = <T>(array: T[]): T[] => {
  return array
    .map(item => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
};

router.get("/trivia-questions", (req: Request, res: Response) => {
  const origin = req.get("origin");
  if (origin !== "https://tdldgames.vercel.app") {
    console.log(origin);
    return res.status(403).json();
  }

  const triviaQuestions = loadTriviaQuestions();
  const randomQuestions = shuffleArray(triviaQuestions).slice(0, 10);
  res.json(randomQuestions);
});

export default router;
