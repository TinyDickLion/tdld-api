import axios from "axios";
import { TokenDetail, TOKENS } from "../../constants/tokendetails";

export const getRequiredBalance = async (
  tokenDetails: Record<string, TokenDetail>,
  selectedToken: string,
  assetId: number
) => {
  if (selectedToken === TOKENS.TDLD || selectedToken === TOKENS.CAT) {
    const API_VESTIGE_URL = `https://free-api.vestige.fi/asset/${assetId}/price?currency=algo`;
    const { data: priceData } = await axios.get(API_VESTIGE_URL);

    if (tokenDetails[selectedToken]?.minAlgoValue) {
      return Math.floor(
        tokenDetails[selectedToken]?.minAlgoValue ?? 0 / priceData.price
      );
    }
  }
  if (selectedToken === TOKENS.BWOM) {
    return tokenDetails[selectedToken].minBwomLPValue;
  }
  if (selectedToken === TOKENS.REAR) {
    return tokenDetails[selectedToken].minTLPLPValue;
  }

  throw new Error("Unsupported token");
};
