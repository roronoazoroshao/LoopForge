// The chat iframe shares the platform's same-origin language preference.
// Translate explicit UI labels only; never mutate React-managed DOM or chat content.
export function chatLocale() {
  try { return localStorage.getItem("loopforge.lang") === "vi" ? "vi" : "zh"; }
  catch { return "zh"; }
}
export const chatT = (zh, vi) => chatLocale() === "vi" ? vi : zh;
