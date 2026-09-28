// Socket contract shared by the custom server (server.mjs) and the browser
// client. Kept in plain ESM so both the Node server and the Next bundle can
// import the exact same strings — no drift between emitter and listener.

export const SocketEvent = {
  // client -> server
  JoinListing: "join:listing",
  LeaveListing: "leave:listing",
  JoinUser: "join:user",
  JoinShowdown: "join:showdown",
  LeaveShowdown: "leave:showdown",

  // server -> client
  BidNew: "bid:new",
  ListingTimer: "listing:timer",
  ListingClosed: "listing:closed",
  ShowdownUpdate: "showdown:update",
  LeaderboardUpdate: "leaderboard:update",
  Notify: "notify",
  Presence: "presence",
};

export const Room = {
  listing: (id) => `listing:${id}`,
  user: (id) => `user:${id}`,
  showdown: () => "showdown",
  global: () => "global",
};
