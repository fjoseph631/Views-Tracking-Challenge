import * as functions from "firebase-functions";
import { db } from "./index";


/* BONUS OPPORTUNITY
It's not great (it's bad) to throw all of this code in one file.
Can you help us organize this code better?
*/

export async function trackRecordingView(viewerId: string, recordingId: string): Promise<void> {
  // verifying viewing user exists
  const viewingUserSnapshot = await db.collection("Users").doc(viewerId).get();
  if (!viewingUserSnapshot.exists) {
    functions.logger.debug("viewing user does not exist");
    return;
  }
  // verifying recording exists in firestore
  const recordingRef = await db.collection("Recordings").doc(recordingId);
  const recordingSnapshot = await recordingRef.get();
  if (recordingSnapshot.exists) {
    const recordingData = recordingSnapshot.data();
    if (recordingData !== undefined) {
      // get user data of recording
      const recordingUserRef = await db.collection("Users").doc(recordingData.creatorId);
      const recordingUserSnapshot = await recordingUserRef.get();
      if (!recordingUserSnapshot.exists) {
        functions.logger.debug("Recording user does not exist");
        return;
      }
      // querying viewers subcollection based on id 
      const viewsRecordingUserSnapshot = await db.collection("Recordings").doc(recordingId).collection("Viewers").where('id', '==', viewerId).get()
      if (viewsRecordingUserSnapshot.empty) {
        // adding new viewer to recording's viewer subcollection
        await db.collection("Recordings").doc(recordingId).collection("Viewers").add({
          id: viewerId,
        });
      }
      else {
        functions.logger.debug("Viewer has already seen this recording");
        return;
      }
      // updating user with incremented uniuqueRecordingViewCount and recording's uniqueViewCount
      // updating using a transaction to confirm updates are both done at the same time
      try {
        await db.runTransaction(async (t) => {
          const recordingDoc = await t.get(recordingRef);
          const recordingLockedData = await recordingDoc.data();
          const userDoc = await t.get(recordingUserRef);
          const userLockedData = await userDoc.data();
          if (recordingLockedData !== undefined) {
            t.update(recordingRef, { uniqueViewCount: recordingLockedData.uniqueViewCount + 1 });
          }
          if (userLockedData !== undefined) {
            t.update(recordingUserRef, { uniqueRecordingViewCount: userLockedData.uniqueRecordingViewCount + 1 })
          }
        });

        console.log('Transaction success!');
      } catch (e) {
        console.log('Transaction failure:', e);
      }
    }
  } else {
    functions.logger.debug("recording didn't exist");
  }
}
