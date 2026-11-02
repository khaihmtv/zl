/**
 * Zalo Bot Mini Service (Port 3003)
 *
 * API Endpoints:
 *   GET  /status          → Bot status (loggedIn, sessionExists, isSending, stats)
 *   GET  /qr-image        → QR code PNG image for login
 *   POST /send            → Send message { to: string, message: string }
 *   GET  /conversations   → List all conversations (name, lastMessage, time)
 *   POST /conversations/read → Read messages from a conversation { name: string, limit?: number }
 *   GET  /logout          → Logout and clear session
 *   POST /restart         → Restart browser
 *   GET  /logs            → Get send logs
 *   DELETE /logs          → Clear all logs
 */

import express from "express";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import fs from "fs";
import path from "path";

// ──────────────────────────────────────────────
// Config
// ──────────────────────────────────────────────
const PORT = 3003;
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const SESSION_FILE = path.resolve(DATA_DIR, "session.json");
const LOG_FILE = path.resolve(DATA_DIR, "logs.json");

// ──────────────────────────────────────────────
// State
// ──────────────────────────────────────────────
let browser: Browser | null = null;
let context: BrowserContext | null = null;
let page: Page | null = null;
let qrBuffer: Buffer | null = null;
let loggedIn = false;
let isSending = false;
let browserStarting = false;
let lastError = "";

// ──────────────────────────────────────────────
// Logging
// ──────────────────────────────────────────────
interface LogEntry {
  timestamp: string;
  to: string;
  message: string;
  status: "success" | "warning" | "failed";
  note?: string;
}

function readLogs(): LogEntry[] {
  try {
    if (!fs.existsSync(LOG_FILE)) return [];
    const raw = fs.readFileSync(LOG_FILE, "utf-8").trim();
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLog(entry: LogEntry): void {
  const logs = readLogs();
  logs.unshift(entry);
  if (logs.length > 1000) logs.splice(1000);
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2), "utf-8");
  const icon = entry.status === "success" ? "✓" : entry.status === "warning" ? "⚠" : "✗";
  console.log(`[Log] ${icon} to="${entry.to}" | ${entry.status} | ${entry.note || ""}`);
}

// ──────────────────────────────────────────────
// Browser Management
// ──────────────────────────────────────────────
async function startBrowser(): Promise<void> {
  if (browser || browserStarting) return;
  browserStarting = true;
  lastError = "";

  try {
    console.log("[Browser] Đang khởi động Chromium...");

    browser = await chromium.launch({
      headless: true,
      slowMo: 200,
      args: [
        "--disable-gpu",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-extensions",
      ],
    });

    console.log("[Browser] Chromium đã khởi động ✓");

    browser.on("disconnected", async () => {
      console.log("[Browser] Bị ngắt, đang khởi động lại...");
      browser = null;
      context = null;
      page = null;
      loggedIn = false;
      browserStarting = false;
      try {
        await startBrowser();
      } catch (e: any) {
        lastError = `Browser restart failed: ${e.message}`;
        console.error("[Browser] Restart failed:", e.message);
      }
    });

    // Load session if available
    const contextOptions: any = {};
    try {
      if (fs.existsSync(SESSION_FILE)) {
        const raw = fs.readFileSync(SESSION_FILE, "utf-8").trim();
        if (raw && raw.startsWith("{")) {
          contextOptions.storageState = SESSION_FILE;
          console.log("[Browser] Đã load session cũ");
        }
      }
    } catch (e: any) {
      console.log("[Browser] Không đọc được session cũ:", e.message);
    }

    context = await browser.newContext({
      ...contextOptions,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
    });

    page = await context.newPage();

    console.log("[Browser] Đang mở chat.zalo.me...");
    await page.goto("https://chat.zalo.me", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(5000);

    // Check if already logged in
    const isLoggedInNow = await checkLoggedIn();

    if (isLoggedInNow) {
      loggedIn = true;
      console.log("[Browser] Đã đăng nhập với session cũ ✓");
      await closePopupIfAny();
    } else {
      console.log("[Browser] Chưa đăng nhập, chờ quét QR...");
      startQrLoop();
      waitForLogin();
    }
  } catch (e: any) {
    lastError = `Browser start failed: ${e.message}`;
    console.error("[Browser] Lỗi khởi động:", e.message);
    // Cleanup on failure
    if (browser) {
      await browser.close().catch(() => {});
    }
    browser = null;
    context = null;
    page = null;
  } finally {
    browserStarting = false;
  }
}

async function checkLoggedIn(): Promise<boolean> {
  if (!page) return false;
  const selectors = [
    "#contact-search-input",
    "[placeholder*='Tìm kiếm']",
    "[placeholder*='Tìm']",
    "[class*='main-panel']",
    ".conv-item",
    "[class*='sidebar']",
  ];
  for (const sel of selectors) {
    try {
      const v = await page.locator(sel).first().isVisible({ timeout: 3000 });
      if (v) return true;
    } catch {
      // continue
    }
  }
  return false;
}

async function closePopupIfAny(): Promise<void> {
  if (!page) return;
  try {
    const closeBtn = page.locator('button:has-text("Đóng"), [class*="close-btn"], [class*="popup-close"]').first();
    if (await closeBtn.isVisible({ timeout: 2000 })) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }
  } catch {
    // No popup
  }
}

function startQrLoop(): void {
  const interval = setInterval(async () => {
    if (loggedIn || !page) return clearInterval(interval);

    try {
      // Click "Lấy mã mới" if QR expired
      const refreshBtn = page
        .locator("a.btn.btn--s, a.btn--s, button:has-text('Lấy mã mới')")
        .filter({ hasText: /Lấy mã mới|lấy mã/i })
        .first();
      if (await refreshBtn.isVisible({ timeout: 300 })) {
        console.log("[QR] Mã hết hạn, lấy mã mới...");
        await refreshBtn.click();
        await page.waitForTimeout(2000);
        return;
      }

      // Try to capture QR from <img> tag
      const qrImg = page.locator("div.qrcode img.img, div.qr-container img, div[class*='qrcode'] img").first();
      if (await qrImg.isVisible({ timeout: 300 })) {
        const buf = await qrImg.screenshot();
        if (buf && buf.length > 1024) {
          qrBuffer = buf;
          return;
        }
      }

      // Fallback: screenshot the QR container
      const qrBox = page.locator("div.qrcode, div.qr-container, div[class*='qrcode']").first();
      if (await qrBox.isVisible({ timeout: 300 })) {
        const buf = await qrBox.screenshot();
        if (buf && buf.length > 1024) {
          qrBuffer = buf;
        }
      }

      // Another fallback: canvas
      const canvas = page.locator("canvas").first();
      if (await canvas.isVisible({ timeout: 200 })) {
        const buf = await canvas.screenshot();
        if (buf && buf.length > 1024) {
          qrBuffer = buf;
        }
      }
    } catch {
      // Continue loop
    }
  }, 1000);
}

function waitForLogin(): void {
  if (!page) return;

  page
    .waitForURL("https://chat.zalo.me/**", { timeout: 300000 })
    .then(async () => {
      try {
        const currentUrl = page?.url() || "";
        console.log("[Browser] URL sau QR scan:", currentUrl);

        // Wait for chat page to actually load
        await page?.waitForTimeout(6000);
        await closePopupIfAny();

        console.log("[Browser] Chờ search box xuất hiện...");
        const searchVisible = await page
          ?.locator("#contact-search-input")
          .isVisible({ timeout: 40000 })
          .catch(() => false);

        if (!searchVisible) {
          console.log("[Browser] Search box không xuất hiện, URL:", page?.url());
          loggedIn = false;
          startQrLoop();
          waitForLogin();
          return;
        }

        loggedIn = true;
        qrBuffer = null;

        // Save session
        if (context) {
          await context.storageState({ path: SESSION_FILE });
          console.log("[Browser] Đăng nhập thành công ✓ Session đã lưu vào", SESSION_FILE);
        }

        console.log("[Browser] Trang chat sẵn sàng ✓");
      } catch (e: any) {
        console.error("[Browser] Lỗi sau login:", e.message);
        loggedIn = false;
      }
    })
    .catch(() => {
      console.log("[Browser] waitForURL timeout hoặc lỗi");
    });
}

// ──────────────────────────────────────────────
// Send Message
// ──────────────────────────────────────────────
async function sendMessage(to: string, message: string): Promise<LogEntry> {
  const timestamp = new Date().toISOString();

  if (!loggedIn || !page) {
    const entry: LogEntry = { timestamp, to, message, status: "failed", note: "Chưa đăng nhập Zalo" };
    writeLog(entry);
    throw new Error(entry.note);
  }

  if (isSending) {
    const entry: LogEntry = { timestamp, to, message, status: "failed", note: "Bot đang bận gửi tin khác, thử lại sau" };
    writeLog(entry);
    throw new Error(entry.note);
  }

  isSending = true;

  try {
    // Check page is alive
    const alive = await page.locator("#contact-search-input").isVisible({ timeout: 5000 }).catch(() => false);
    if (!alive) {
      console.log("[Send] Trang mất, navigate lại...");
      await page.goto("https://chat.zalo.me", { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(5000);
      await closePopupIfAny();
      await page.locator("#contact-search-input").waitFor({ timeout: 30000 });
    }

    // Search user
    const searchBox = page.locator("#contact-search-input");
    await searchBox.click();
    await searchBox.fill("");
    await searchBox.fill(to);
    await page.waitForTimeout(2500);

    const user = page.locator(".conv-item").filter({ hasText: to }).first();
    const found = await user.isVisible({ timeout: 10000 }).catch(() => false);
    if (!found) {
      const entry: LogEntry = { timestamp, to, message, status: "failed", note: `Không tìm thấy "${to}" trong danh bạ` };
      writeLog(entry);
      throw new Error(entry.note);
    }

    await user.click();
    await page.waitForTimeout(1000);

    // Type and send
    const chatBox = await page.waitForSelector("#richInput", { timeout: 20000 });
    await chatBox.click();
    await chatBox.fill("");
    await chatBox.fill(message);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2500);

    // Verify message sent
    let verified = false;
    let verifyNote = "";

    try {
      const el = page.getByText(message, { exact: false }).last();
      if (await el.isVisible({ timeout: 4000 })) {
        verified = true;
        verifyNote = "Tìm thấy tin nhắn trong chat";
      }
    } catch {
      // Not verified visually
    }

    if (!verified) {
      try {
        const inputText = await page.locator("#richInput").innerText({ timeout: 2000 });
        if (inputText.trim() === "") {
          verified = true;
          verifyNote = "Input đã xóa sau khi gửi (có thể đã gửi thành công)";
        }
      } catch {
        // continue
      }
    }

    const entry: LogEntry = {
      timestamp,
      to,
      message,
      status: verified ? "success" : "warning",
      note: verified ? verifyNote : "Đã gửi nhưng không xác minh được",
    };
    writeLog(entry);
    return entry;
  } catch (err: any) {
    const logs = readLogs();
    if (!logs.length || logs[0].timestamp !== timestamp) {
      writeLog({ timestamp, to, message, status: "failed", note: err.message });
    }
    throw err;
  } finally {
    isSending = false;
  }
}

// ──────────────────────────────────────────────
// Read Messages from a conversation
// ──────────────────────────────────────────────
async function readMessages(conversationName: string, limit: number = 30): Promise<any[]> {
  if (!loggedIn || !page) {
    throw new Error("Chưa đăng nhập Zalo");
  }

  if (isSending) {
    throw new Error("Bot đang bận, thử lại sau");
  }

  isSending = true;

  try {
    // Check page alive
    const alive = await page.locator("#contact-search-input").isVisible({ timeout: 5000 }).catch(() => false);
    if (!alive) {
      await page.goto("https://chat.zalo.me", { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(5000);
      await closePopupIfAny();
    }

    // Search and click conversation
    const searchBox = page.locator("#contact-search-input");
    await searchBox.click();
    await searchBox.fill("");
    await searchBox.fill(conversationName);
    await page.waitForTimeout(2500);

    const user = page.locator(".conv-item").filter({ hasText: conversationName }).first();
    const found = await user.isVisible({ timeout: 10000 }).catch(() => false);
    if (!found) {
      throw new Error(`Không tìm thấy "${conversationName}"`);
    }

    await user.click();
    await page.waitForTimeout(2000);

    // Scroll up to load more messages
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, -500);
      await page.waitForTimeout(1000);
    }
    await page.waitForTimeout(2000);

    // Extract messages from the chat panel
    const messages = await page.evaluate((maxMsgs: number) => {
      const result: any[] = [];
      // Try multiple selectors for messages
      const msgSelectors = [
        ".message-view__content",
        "[class*='msg-content']",
        ".conv-message",
        "[class*='message'] [class*='content']",
        ".message-bubble",
      ];

      // Try to find message container
      let msgElements: Element[] = [];
      for (const sel of msgSelectors) {
        msgElements = Array.from(document.querySelectorAll(sel));
        if (msgElements.length > 0) break;
      }

      // If no messages found with specific selectors, try broader approach
      if (msgElements.length === 0) {
        const chatPanel = document.querySelector("[class*='message-view'], [class*='chat-content'], .main-panel");
        if (chatPanel) {
          // Get all divs that look like message bubbles
          const allDivs = chatPanel.querySelectorAll("div");
          allDivs.forEach((div) => {
            const text = div.innerText?.trim();
            if (text && text.length > 0 && text.length < 2000 && !div.querySelector("div")) {
              const classList = div.className || "";
              const isOutgoing = classList.includes("out") || classList.includes("send") || classList.includes("right");
              result.push({
                sender: isOutgoing ? "Tôi" : "Đối phương",
                content: text,
                direction: isOutgoing ? "outgoing" : "incoming",
              });
            }
          });
        }
      } else {
        msgElements.slice(-maxMsgs).forEach((el) => {
          const text = el.innerText?.trim();
          if (!text) return;
          const classList = el.className || "";
          const parentClass = el.parentElement?.className || "";
          const isOutgoing =
            classList.includes("out") ||
            classList.includes("send") ||
            classList.includes("right") ||
            parentClass.includes("out") ||
            parentClass.includes("send");
          result.push({
            sender: isOutgoing ? "Tôi" : "Đối phương",
            content: text,
            direction: isOutgoing ? "outgoing" : "incoming",
          });
        });
      }

      return result.slice(-maxMsgs);
    }, limit);

    return messages;
  } finally {
    isSending = false;
  }
}

// ──────────────────────────────────────────────
// Get Conversations List
// ──────────────────────────────────────────────
async function getConversations(): Promise<any[]> {
  if (!loggedIn || !page) {
    throw new Error("Chưa đăng nhập Zalo");
  }

  try {
    // Check page alive
    const alive = await page.locator("#contact-search-input").isVisible({ timeout: 5000 }).catch(() => false);
    if (!alive) {
      await page.goto("https://chat.zalo.me", { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(5000);
      await closePopupIfAny();
    }

    const conversations = await page.evaluate(() => {
      const result: any[] = [];
      const items = document.querySelectorAll(".conv-item");
      items.forEach((item) => {
        try {
          const nameEl = item.querySelector(".conv-item__name, [class*='name'], h3, .conv-name");
          const lastMsgEl = item.querySelector(".conv-item__last-msg, [class*='last-msg'], [class*='preview'], p");
          const timeEl = item.querySelector(".conv-item__time, [class*='time'], time, span[class*='time']");
          const avatarEl = item.querySelector("img, [class*='avatar']");

          const name = nameEl?.innerText?.trim() || "Unknown";
          const lastMsg = lastMsgEl?.innerText?.trim() || "";
          const time = timeEl?.innerText?.trim() || "";
          const avatar = avatarEl?.getAttribute("src") || "";

          // Get unread count
          const badgeEl = item.querySelector("[class*='badge'], [class*='unread'], .conv-item__badge");
          const unread = badgeEl ? parseInt(badgeEl.innerText?.trim() || "0", 10) : 0;

          if (name && name !== "Unknown") {
            result.push({ name, lastMessage: lastMsg, time, avatar, unread });
          }
        } catch {
          // skip
        }
      });
      return result;
    });

    return conversations;
  } catch (e: any) {
    console.error("[Conv] Lỗi lấy danh sách hội thoại:", e.message);
    return [];
  }
}

// ──────────────────────────────────────────────
// Express App
// ──────────────────────────────────────────────
const app = express();
app.use(express.json());

// CORS for local development
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Health check
app.get("/", (_req, res) => {
  res.json({ service: "zalo-bot", version: "1.0.0", port: PORT });
});

// Status
app.get("/status", (_req, res) => {
  const logs = readLogs();
  res.json({
    loggedIn,
    isSending,
    browserStarting,
    lastError: lastError || undefined,
    sessionExists: fs.existsSync(SESSION_FILE),
    stats: {
      total: logs.length,
      success: logs.filter((l) => l.status === "success").length,
      warning: logs.filter((l) => l.status === "warning").length,
      failed: logs.filter((l) => l.status === "failed").length,
    },
  });
});

// QR Image
app.get("/qr-image", (_req, res) => {
  if (loggedIn) return res.status(200).json({ status: "logged_in" });
  if (!qrBuffer) return res.status(204).send();
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "no-store");
  res.send(qrBuffer);
});

// Send message
app.post("/send", async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ error: 'Thiếu "to" hoặc "message"' });
  }
  if (!loggedIn) {
    return res.status(403).json({ error: "Chưa đăng nhập. Vào trang QR để quét mã" });
  }
  if (isSending) {
    return res.status(429).json({ error: "Bot đang bận, thử lại sau vài giây" });
  }

  try {
    const result = await sendMessage(to, message);
    res.json({ status: result.status, note: result.note, to, message });
  } catch (err: any) {
    res.status(500).json({ status: "failed", error: err.message });
  }
});

// Get conversations
app.get("/conversations", async (_req, res) => {
  if (!loggedIn) {
    return res.status(403).json({ error: "Chưa đăng nhập" });
  }
  try {
    const convos = await getConversations();
    res.json({ conversations: convos, total: convos.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Read messages from conversation
app.post("/conversations/read", async (req, res) => {
  const { name, limit = 30 } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Thiếu "name"' });
  }
  if (!loggedIn) {
    return res.status(403).json({ error: "Chưa đăng nhập" });
  }
  try {
    const messages = await readMessages(name, limit);
    res.json({ messages, total: messages.length, conversation: name });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get logs
app.get("/logs", (_req, res) => {
  const logs = readLogs();
  res.json({
    total: logs.length,
    stats: {
      success: logs.filter((l) => l.status === "success").length,
      warning: logs.filter((l) => l.status === "warning").length,
      failed: logs.filter((l) => l.status === "failed").length,
    },
    logs,
  });
});

// Clear logs
app.delete("/logs", (_req, res) => {
  try {
    if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);
    res.json({ ok: true, message: "Đã xóa toàn bộ logs" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Logout
app.get("/logout", async (_req, res) => {
  loggedIn = false;
  qrBuffer = null;
  isSending = false;
  lastError = "";

  if (browser) {
    await browser.close().catch(() => {});
  }
  browser = null;
  context = null;
  page = null;

  if (fs.existsSync(SESSION_FILE)) {
    fs.unlinkSync(SESSION_FILE);
  }

  res.json({ ok: true, message: "Đã đăng xuất và xóa session" });
});

// Restart browser
app.post("/restart", async (_req, res) => {
  loggedIn = false;
  qrBuffer = null;
  isSending = false;
  lastError = "";

  if (browser) {
    await browser.close().catch(() => {});
  }
  browser = null;
  context = null;
  page = null;
  browserStarting = false;

  res.json({ ok: true, message: "Đang khởi động lại browser..." });

  startBrowser().catch((e: any) => {
    lastError = `Restart failed: ${e.message}`;
    console.error("[Restart] Failed:", e.message);
  });
});

// ──────────────────────────────────────────────
// Start
// ──────────────────────────────────────────────
async function main() {
  app.listen(PORT, () => {
    console.log(`\n✅ Zalo Bot Service running on port ${PORT}`);
    console.log(`   Status:   GET  http://localhost:${PORT}/status`);
    console.log(`   QR:       GET  http://localhost:${PORT}/qr-image`);
    console.log(`   Send:     POST http://localhost:${PORT}/send`);
    console.log(`   Convos:   GET  http://localhost:${PORT}/conversations`);
    console.log(`   Read:     POST http://localhost:${PORT}/conversations/read`);
    console.log(`   Logs:     GET  http://localhost:${PORT}/logs`);
    console.log(`   Logout:   GET  http://localhost:${PORT}/logout`);
    console.log(`   Restart:  POST http://localhost:${PORT}/restart\n`);
  });

  // Start browser in background
  startBrowser().catch(console.error);
}

main().catch(console.error);
