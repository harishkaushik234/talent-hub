import { requireAuth } from "@clerk/express";
import User from "../models/User.js";
import { upsertStreamUser } from "../lib/stream.js";

export const protectRoute = [
  requireAuth(),
  async (req, res, next) => {
    try {
      const clerkId = req.auth().userId;

      if (!clerkId) return res.status(401).json({ message: "Unauthorized - invalid token" });

      // atomically insert a dev user if missing, but only call Stream upsert when we actually created a user
      const upsertResult = await User.updateOne(
        { clerkId },
        {
          $setOnInsert: {
            name: "Dev User",
            email: `${clerkId}@example.com`,
            profileImage: "",
            clerkId,
          },
        },
        { upsert: true }
      );

      const created = upsertResult.upsertedCount && upsertResult.upsertedCount > 0;

      // read the user document
      const user = await User.findOne({ clerkId });

      if (created) {
        try {
          await upsertStreamUser({ id: user.clerkId.toString(), name: user.name, image: user.profileImage });
          console.log("Stream user upserted for new dev user:", user.clerkId);
        } catch (err) {
          console.error("upsertStreamUser failed:", err?.message || err);
        }
      }

      // attach user to req
      req.user = user;

      next();
    } catch (error) {
      console.error("Error in protectRoute middleware", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
];
