import * as functions from "firebase-functions";
import { firestore } from "firebase-admin";
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
  const recordingSnapshot = await db.collection("Recordings").doc(recordingId).get();
  if (recordingSnapshot.exists) {
    const recordingData = recordingSnapshot.data();
    if (recordingData !== undefined) {
      // get user data of recording
      const recordingUserSnapshot = await db.collection("Users").doc(recordingData.creatorId).get();
      if (!recordingUserSnapshot.exists) {
        functions.logger.debug("Recording user does not exist");
        return;
      }
      // querying viewers subcollection based on id 
      const viewsRecordingUserSnapshot = await db.collection("Recordings").doc(recordingId).collection("Viewers").where('id', '==', viewerId).get()
      if (viewsRecordingUserSnapshot.empty) {
        functions.logger.debug("Viewer not found in recording subcollection");
        // adding new viewer to recording's viewer subcollection
        await db.collection("Recordings").doc(recordingId).collection("Viewers").add({
          id: viewerId,
        });
      }
      else {
        functions.logger.debug("Viewer found in recording subcollection");
        return;
      }
      // update document with incremented uniuqeViewCount
      await db.collection("Recordings").doc(recordingId).update({
        id: recordingData.id,
        uniqueViewCount: firestore.FieldValue.increment(1)
      });
      // update document with incremented uniuqueRecordingViewCount
      const recordingUserData = recordingUserSnapshot.data();
      if (recordingUserData !== undefined) {
        await db.collection("Users").doc(recordingUserData.id).update({
          id: recordingUserData.id,
          uniqueRecordingViewCount: firestore.FieldValue.increment(1)
        });
      }
    }
  } else {
    functions.logger.debug("recording didn't exist");
  }
}
