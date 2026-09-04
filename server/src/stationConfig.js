export const stationConfig = {
  stationName: "Harrison Radio Station",
  callsign: "HARRISON RADIO",
  tagline: "24/7 Live Web Radio",
  genre: "24/7 Live Web Broadcast",
  accentColor: "#1DB954", // Spotify Green
  secondaryColor: "#1ed760",
  bgColor: "#0e0e0f",
  panelBg: "#18181a",
  borderColor: "#2a2a2c",
  defaultPlaylistUrl: "https://open.spotify.com/playlist/6GYZ7RuNutGzFMKAZYSzhb",
  rotationTiers: {
    power: { minPopularity: 70, weight: 0.50 },    // Heavy rotation
    medium: { minPopularity: 40, weight: 0.35 },   // Medium rotation
    discovery: { minPopularity: 0, weight: 0.15 }, // Recurrent / Discovery
  },
  artistSeparationCount: 3, // Min tracks before the same artist can repeat
  trackCooldownFraction: 0.4, // Min 40% of playlist tracks before a track can replay
};
