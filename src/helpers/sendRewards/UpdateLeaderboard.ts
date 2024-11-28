import { db } from "../../config/firebase";
import admin from "firebase-admin";

export const getLeaderboardCollection = () => {
  const currentDate = new Date();

  // Find the closest Monday in UTC
  const day = currentDate.getUTCDay(); // Day of the week in UTC (0 = Sunday, 1 = Monday, etc.)
  const daysSinceMonday = (day + 6) % 7; // Days since the last Monday
  const mondayOfThisWeek = new Date(currentDate);
  mondayOfThisWeek.setUTCDate(currentDate.getUTCDate() - daysSinceMonday);
  mondayOfThisWeek.setUTCHours(0, 0, 0, 0); // Reset time to start of the day in UTC

  // Align with the first Monday after Unix epoch in UTC
  const epochMonday = new Date(Date.UTC(1970, 0, 5)); // Jan 5, 1970, is the first Monday after Jan 1, 1970
  const weekNumber = Math.floor(
    (mondayOfThisWeek.getTime() - epochMonday.getTime()) / (1000 * 60 * 60 * 24 * 7)
  );

  // Return a collection name that reflects the week number
  return `weekly_leaderboard_${weekNumber}`;
};

export const updateLeaderboard = async (to: any) => {
  const leaderboardCollection = getLeaderboardCollection();
  const userRef = db.collection(leaderboardCollection).doc(to);

  const userDoc = await userRef.get();

  if (userDoc.exists) {
    await userRef.update({
      points: admin.firestore.FieldValue.increment(10),
      updates: admin.firestore.FieldValue.arrayUnion(new Date().toISOString()),
    });
  } else {
    await userRef.set({
      walletAddress: to,
      points: 10,
      updates: [new Date().toISOString()],
    });
  }
};
