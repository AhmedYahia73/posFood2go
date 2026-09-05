import Echo from "laravel-echo";
import Pusher from "pusher-js";

const appKey = import.meta.env.VITE_REVERB_APP_KEY;

let echo = null;

if (appKey) {
  window.Pusher = Pusher;

  echo = new Echo({
    broadcaster: "reverb",
    key: appKey,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
    forceTLS: import.meta.env.VITE_REVERB_SCHEME === "https",
    enabledTransports: ["ws", "wss"],
    disableStats: true,
  });
} else {
  console.warn("[Echo] VITE_REVERB_APP_KEY is not set — real-time features are disabled.");
}

export default echo;
