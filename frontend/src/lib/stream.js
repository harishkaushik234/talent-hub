import { StreamVideoClient } from "@stream-io/video-react-sdk";

const apiKey = import.meta.env.VITE_STREAM_API_KEY;

let client = null;

export const initializeStreamClient = async (user, token) => {
  // if client exists with same user instead of creating again return it
  if (client && client?.user?.id === user.id) return client;

  // if we have an existing client for another user, disconnect it first
  if (client) {
    await disconnectStreamClient();
  }

  if (!apiKey) throw new Error("Stream API key is not provided.");

  // Prefer SDK helper if available to avoid duplicate-global-client warnings
  try {
    if (typeof StreamVideoClient.getOrCreateInstance === "function") {
      client = await StreamVideoClient.getOrCreateInstance({ apiKey, user, token });
      return client;
    }

    // fallback to getInstance if SDK exposes it
    if (typeof StreamVideoClient.getInstance === "function") {
      const existing = StreamVideoClient.getInstance(user.id);
      if (existing && existing.user?.id === user.id) {
        client = existing;
        return client;
      }
    }
  } catch (err) {
    // swallow and fall back to constructor
    console.debug("StreamVideoClient helper unavailable or failed, falling back:", err?.message || err);
  }

  // final fallback: create a new client instance
  client = new StreamVideoClient({ apiKey, user, token });

  return client;
};

export const disconnectStreamClient = async () => {
  if (client) {
    try {
      await client.disconnectUser();
      client = null;
    } catch (error) {
      console.error("Error disconnecting Stream client:", error);
    }
  }
};
