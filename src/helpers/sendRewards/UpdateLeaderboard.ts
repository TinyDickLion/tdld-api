import { db } from "../../config/firebase";
import admin from "firebase-admin";

export const getLeaderboardCollection = () => {
  const currentDate = new Date();

  // Find the closest Monday
  const day = currentDate.getDay(); // Day of the week (0 = Sunday, 1 = Monday, etc.)
  const daysSinceMonday = day === 0 ? 6 : day - 1; // Days since the last Monday
  const mondayOfThisWeek = new Date(currentDate);
  mondayOfThisWeek.setDate(currentDate.getDate() - daysSinceMonday);

  // Calculate the week number based on Monday
  const weekNumber = Math.floor(
    mondayOfThisWeek.getTime() / (1000 * 60 * 60 * 24 * 7)
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
