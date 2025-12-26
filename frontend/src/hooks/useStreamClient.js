import { useState, useEffect, useRef } from "react";
import { StreamChat } from "stream-chat";
import toast from "react-hot-toast";
import { initializeStreamClient, disconnectStreamClient } from "../lib/stream";
import { sessionApi } from "../api/sessions";

function useStreamClient(session, loadingSession, isHost, isParticipant) {
  const [streamClient, setStreamClient] = useState(null);
  const [call, setCall] = useState(null);
  const [chatClient, setChatClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [isInitializingCall, setIsInitializingCall] = useState(true);
  const lastAttemptedCallIdRef = useRef(null);

  useEffect(() => {
    let videoCall = null;
    let chatClientInstance = null;
    const lastAttemptedCallId = lastAttemptedCallIdRef.current;

    const initCall = async () => {
      if (!session?.callId) return;
      if (!isHost && !isParticipant) return;
      if (session.status === "completed") return;

      // Prevent repeated join attempts for the same callId from this hook
      if (lastAttemptedCallIdRef.current === session.callId) return;
      lastAttemptedCallIdRef.current = session.callId;

      try {
        const { token, userId, userName, userImage } = await sessionApi.getStreamToken();

        const client = await initializeStreamClient(
          {
            id: userId,
            name: userName,
            image: userImage,
          },
          token
        );

        setStreamClient(client);

        videoCall = client.call("default", session.callId);

        // try joining with video; if camera is busy or NotReadableError occurs,
        // fall back to audio-only to allow the user to join the session.
        try {
          await videoCall.join({ create: true });
          setCall(videoCall);
        } catch (joinErr) {
          console.warn("Video join failed, attempting audio-only join:", joinErr?.message || joinErr);

          const isNotReadable =
            (joinErr && typeof joinErr.name === "string" && joinErr.name.includes("NotReadableError")) ||
            (joinErr && typeof joinErr.message === "string" && joinErr.message.includes("Device in use"));

          // If the camera is busy, avoid calling getUserMedia ourselves (it can trigger the same error).
          if (isNotReadable) {
            try {
              await videoCall.join({ create: true, constraints: { audio: true, video: false } });
              setCall(videoCall);
              toast("Joined audio-only (camera unavailable)");
            } catch (audioErr) {
              throw audioErr;
            }
          } else {
            // Best-effort: try to stop local video tracks then retry audio-only
            try {
              const localTracks = videoCall?.localTracks || [];
              for (const t of localTracks) {
                try {
                  t.stop && t.stop();
                } catch (e) { }
              }
              if (navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                  const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
                  stream.getTracks().forEach((t) => { try { t.stop(); } catch (e) { } });
                } catch (e) { /* ignore */ }
              }
            } catch (e) { }

            try {
              await videoCall.join({ create: true, constraints: { audio: true, video: false } });
              setCall(videoCall);
              toast("Joined audio-only (camera unavailable)");
            } catch (audioErr) {
              throw audioErr;
            }
          }
        }

        const apiKey = import.meta.env.VITE_STREAM_API_KEY;
        chatClientInstance = StreamChat.getInstance(apiKey);

        // Only call connectUser if not already connected as the same user
        let connectedHere = false;
        try {
          if (chatClientInstance.userID !== userId) {
            await chatClientInstance.connectUser(
              {
                id: userId,
                name: userName,
                image: userImage,
              },
              token
            );
            connectedHere = true;
          }
        } catch (err) {
          // If connectUser fails, rethrow to be handled by outer catch
          throw err;
        }

        // store a flag on the instance so cleanup can know if we connected it here
        if (connectedHere) chatClientInstance.__connectedByThisHook = true;

        setChatClient(chatClientInstance);

        const chatChannel = chatClientInstance.channel("messaging", session.callId);
        await chatChannel.watch();
        setChannel(chatChannel);
      } catch (error) {
        toast.error("Failed to join video call");
        console.error("Error init call", error);
      } finally {
        setIsInitializingCall(false);
      }
    };

    if (session && !loadingSession) initCall();

    // cleanup - performance reasons
    return () => {
      // iife
      (async () => {
        try {
          if (videoCall) await videoCall.leave();

          // Only disconnect the chatClient if this hook connected it
          if (chatClientInstance && chatClientInstance.__connectedByThisHook) {
            try {
              await chatClientInstance.disconnectUser();
            } catch (e) {
              // ignore disconnect errors
            }
            chatClientInstance.__connectedByThisHook = false;
          }

          await disconnectStreamClient();
        } catch (error) {
          // ignore benign "already been left" errors from the SDK
          if (error && typeof error.message === "string" && error.message.includes("already been left")) {
            console.debug("Ignored leave() error: call already left");
          } else {
            console.error("Cleanup error:", error);
          }
        }
      })();
    };
  }, [session, loadingSession, isHost, isParticipant]);

  return {
    streamClient,
    call,
    chatClient,
    channel,
    isInitializingCall,
  };
}

export default useStreamClient;
