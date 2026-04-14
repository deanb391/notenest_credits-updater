const { Client, Databases, Query } = require("node-appwrite");
require("dotenv").config();

module.exports = async ({ req, res, log, error }) => {
  try {
    
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
    const USER_COLLECTION = "6846b193001612483bd0"; // make sure this matches your actual collection

    let usersUpdated = 0;
    let offset = 0;
    const limit = 100;

    while (true) {
      const users = await databases.listDocuments(
        DATABASE_ID,
        USER_COLLECTION,
        [
          Query.lessThan("credits", 40),
          Query.equal("isSubscribed", false),
          Query.limit(limit),
          Query.offset(offset)
        ]
      );


      if (users.documents.length === 0) break;

      for (const user of users.documents) {
        try {
          // Update credits
          await databases.updateDocument(
            DATABASE_ID,
            USER_COLLECTION,
            user.$id,
            {
              credits: 40
            }
          );

          // Call your backend notification endpoint
          await sendNotification(user.$id);

          usersUpdated++;
        } catch (err) {
          error(`Failed for user ${user.$id}: ${err.message}`);
        }
      }

      offset += limit;
    }

    return res.json({
      success: true,
      usersUpdated
    });

  } catch (err) {
    error(err);
    return res.json({ success: false });
  }
};


// ---- Helper to call your Python backend ----
const sendNotification = async (userId) => {
  const fetch = require("node-fetch");

  try {
    await fetch(process.env.NOTIFICATION_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        title: "Daily Credits Refilled",
        body: "Your credits have been topped up. Back to studying.",
        data: {
            type: "credits_refilled"
        }
      })
    });
  } catch (err) {
    console.error("Notification error:", err.message);
  }
};

// ---- LOCAL TEST RUNNER ----
if (require.main === module) {
    const fakeReq = {};
    
    const fakeRes = {
      json: (data) => {
        console.log("RESPONSE:", JSON.stringify(data, null, 2));
      }
    };
  
    const log = console.log;
    const error = console.error;
  
    module.exports({ req: fakeReq, res: fakeRes, log, error });
  }