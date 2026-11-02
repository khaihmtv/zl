/**
 * Server-side URL for the Zalo Bot mini-service.
 * In Docker, containers communicate via service names (e.g. http://zalo-bot:3003).
 * Locally, they communicate via localhost.
 */
export const ZALO_BOT_URL = process.env.ZALO_BOT_URL || "http://localhost:3003";
