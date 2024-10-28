import express from "express";

import MessageResponse from "../interfaces/MessageResponse";
import sendRewards from "./sendRewards";
import checkDeposit from "./checkDeposit";

const router = express.Router();

router.get<{}, MessageResponse>("/", (req, res) => {
  res.json({
    message: "API - 👋🌎🌍🌏",
  });
});
router.use("/", sendRewards);
router.use("/", checkDeposit);

export default router;
