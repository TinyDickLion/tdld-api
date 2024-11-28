export type TokenDetail = {
  assetId: number;
  rewardAssetID: number;
  minAlgoValue?: number; // Optional, since not all tokens might have this field
  minBwomLPValue?: number; // Optional
  minTLPLPValue?: number; // Optional
  rewardPercent: number;
};

export const tokenDetails: Record<string, TokenDetail> = {
  tdld: {
    assetId: 2176744157,
    rewardAssetID: 2176744157,
    minAlgoValue: 25,
    rewardPercent: 0.13,
  },
  bwom: {
    assetId: 2328010867,
    rewardAssetID: 2327984798,
    minBwomLPValue: 6.9,
    rewardPercent: 6.9,
  },
  rear: {
    assetId: 1036120453,
    rewardAssetID: 2413037774,
    minTLPLPValue: 5,
    rewardPercent: 2,
  },
  cat: {
    assetId: 1691166331,
    rewardAssetID: 1691166331,
    minAlgoValue: 25,
    rewardPercent: 2,
  },
};

export const TOKENS = {
  TDLD: "tdld",
  REAR: "rear",
  BWOM: "bwom",
  CAT: "cat",
};

export const BWOM_START_DATE = new Date("2024-11-14");
export const TLP_START_DATE = new Date("2024-11-22");
export const CAT_START_DATE = new Date("2024-11-28");
