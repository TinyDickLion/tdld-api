import { getAccountBalance } from "../../algorand/transactionHelpers/getAccountBalance";
import {
  BWOM_START_DATE,
  TLP_START_DATE,
  TokenDetail,
  TOKENS,
} from "../../constants/tokendetails";

const REWARD_GIVER_ADDRESS =
  "TOAQFF5LSU43LKGAKUQUPYA4XQRJJTLMCROCQGJSACSD3UVEDBXBHWNKNM";

export const calculateRewardAmount = async (
  tokenDetails: Record<string, TokenDetail>,
  selectedToken: string,
  heldAmount: number
) => {
  // Handle TDLD reward calculation directly
  if (selectedToken === TOKENS.TDLD) {
    const { rewardPercent } = tokenDetails[selectedToken];
    return (heldAmount * rewardPercent) / 100;
  }

  // Fetch reward provider's account balance
  const rewardProviderInfo = await getAccountBalance(REWARD_GIVER_ADDRESS);
  if (!rewardProviderInfo?.assets) {
    throw new Error("Reward provider information is missing or invalid.");
  }

  // Locate the relevant asset in the reward provider's holdings
  const rewardProviderAsset = rewardProviderInfo.assets.find(
    (asset: any) =>
      asset["asset-id"] === tokenDetails[selectedToken].rewardAssetID
  );

  // Determine provider holdings based on token type
  const divisor = selectedToken === TOKENS.REAR ? 100000000 : 1000000;
  const providerHoldings = rewardProviderAsset
    ? rewardProviderAsset.amount / divisor
    : 0;

  // Handle REAR reward calculation
  if (selectedToken === TOKENS.REAR) {
    const rearRewardPercent = calculateDynamicRearRewardPercent(
      TLP_START_DATE,
      tokenDetails
    );
    return (providerHoldings * rearRewardPercent) / 100;
  }

  // Handle BWOM reward calculation dynamically
  if (selectedToken === TOKENS.BWOM) {
    const bwomRewardPercent = calculateDynamicBwomRewardPercent(
      BWOM_START_DATE,
      tokenDetails
    );
    return (providerHoldings * bwomRewardPercent) / 100;
  }

  throw new Error("Unsupported token type.");
};

const calculateDynamicBwomRewardPercent = (
  bwomStartDate: Date,
  tokenDetails: Record<string, TokenDetail>
) => {
  const daysSinceStart = Math.floor(
    (Date.now() - bwomStartDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const reductions = Math.floor(daysSinceStart / 2);
  return Math.max(
    0,
    tokenDetails[TOKENS.BWOM].rewardPercent - reductions * 0.46
  );
};

const calculateDynamicRearRewardPercent = (
  tlpStartDate: Date,
  tokenDetails: Record<string, TokenDetail>
) => {
  const daysSinceStart = Math.floor(
    (Date.now() - tlpStartDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const reductions = Math.floor(daysSinceStart / 2);
  return Math.max(
    0,
    tokenDetails[TOKENS.REAR].rewardPercent - reductions * 0.02
  );
};
