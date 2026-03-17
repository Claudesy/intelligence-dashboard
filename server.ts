// Architected and built by the one and only Claudesy.

// Suppress known Node.js deprecation warnings (url.parse required by Next.js handle())
process.removeAllListeners("warning");
process.on("warning", (warning: Error & { code?: string }) => {
  if (warning.name === "DeprecationWarning" && warning.code === "DEP0169") return;
  if (warning.message?.includes("SSL modes")) return;
  process.stderr.write(`${warning.name}: ${warning.message}\n`);
});

import { GoogleGenAI, Modality, type Session } from "@google/genai";
import { createServer } from "http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { parse } from "node:url";
import {
  buildAudreyCoreSystemPrompt,
  getAudreyPreferredAddress,
  type AudreySessionUser,
} from "./src/lib/audrey-persona";
import type { CrewAccessSession } from "./src/lib/crew-access";
import { setSocketIO } from "./src/lib/emr/socket-bridge";
import { initializeDashboardObservability } from "./src/lib/intelligence/runtime-observability";
import { setIntelligenceNamespace } from "./src/lib/intelligence/socket-bridge";
import { setNotamSocketIO } from "./src/lib/notam/socket-bridge";
import { getCrewSessionFromCookieHeader } from "./src/lib/server/crew-access-auth";
import { listAllCrewProfiles } from "./src/lib/server/crew-access-profile";
import { trackUserLoginToday } from "./src/lib/server/online-today-tracker";
import { setTeleSocketIO } from "./src/lib/telemedicine/socket-bridge";

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev, turbopack: false, dir: __dirname } as Parameters<typeof next>[0]);
const handle = app.getRequestHandler();

const MAX_MESSAGE_TEXT_LENGTH = 5000;
const MAX_ROOM_ID_LENGTH = 200;

type UserPresence = {
  userId: string;
  name: string;
  role: string;
  profession: string;
  institution: string;
  socketId: string;
  joinedAt: number;
};

const onlineUsers = new Map<string, UserPresence>();

app.prepare().then(async () => {
  try {
    await initializeDashboardObservability();
  } catch {
    // Observability optional — silent skip
  }
  const httpServer = createServer((req, res) => {
    handle(req, res, parse(req.url!, true));
  });

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: [
        "https://puskesmasbalowerti.com",
        "https://www.puskesmasbalowerti.com",
        "https://crew.puskesmasbalowerti.com",
        "https://primary-healthcare-production.up.railway.app",
        /^chrome-extension:\/\//,
        ...(process.env.NODE_ENV !== "production"
          ? [
              "http://localhost:3000",
              "http://localhost:3001",
              /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
            ]
          : []),
      ],
      methods: ["GET", "POST"],
    },
  });

  // EMR Auto-Fill Engine: inject io instance untuk progress events
  setSocketIO(io);
  // Telemedicine: inject io untuk real-time request dari website
  setTeleSocketIO(io);
  // NOTAM: inject io untuk broadcast notifications
  setNotamSocketIO(io);
  // Intelligence Dashboard: namespace /intelligence untuk encounter, alert, eklaim, cdss events
  const intelligenceNS = io.of("/intelligence");
  intelligenceNS.use((socket, next) => {
    const cookieHeader = socket.handshake.headers.cookie ?? "";
    const session = getCrewSessionFromCookieHeader(cookieHeader);
    if (!session) {
      return next(new Error("Sesi tidak valid. Silakan login kembali."));
    }
    socket.data.session = session;
    next();
  });
  intelligenceNS.on("connection", () => {
    // Connection handled by namespace middleware
  });
  setIntelligenceNamespace(intelligenceNS);

  // ── Auth middleware: verify crew session cookie ──
  io.use((socket, next) => {
    const cookieHeader = socket.handshake.headers.cookie ?? "";
    const session = getCrewSessionFromCookieHeader(cookieHeader);
    if (!session) {
      return next(new Error("Sesi tidak valid. Silakan login kembali."));
    }
    socket.data.session = session;
    next();
  });

  io.on("connection", (socket) => {
    const session = socket.data.session as CrewAccessSession;

    // User join: register to online list using server-verified identity + fullName from profile
    socket.on("user:join", () => {
      // Track unique user login for today
      trackUserLoginToday(session.username);
      
      const profiles = listAllCrewProfiles();
      const profile = profiles.get(session.username);
      onlineUsers.set(session.username, {
        userId: session.username,
        name: profile?.fullName || session.displayName,
        role: session.role,
        profession: session.profession,
        institution: session.institution,
        socketId: socket.id,
        joinedAt: Date.now(),
      });
      void socket.join("crew");
      // Dokter join personal room for targeted consult delivery
      void socket.join(`doctor:${profile?.fullName || session.displayName}`);
      io.to("crew").emit("users:online", Array.from(onlineUsers.values()));
    });

    // EMR triage → doctor relay (validate payload + stamp sender identity)
    socket.on("emr:triage-send", (payload: unknown) => {
      if (!payload || typeof payload !== "object") return;
      const raw = payload as Record<string, unknown>;
      const targetUserId =
        typeof raw.targetUserId === "string" ? raw.targetUserId.trim() : "";
      if (!targetUserId || !raw.data || typeof raw.data !== "object") return;
      const target = onlineUsers.get(targetUserId);
      if (target) {
        io.to(target.socketId).emit("emr:triage-receive", {
          ...(raw.data as Record<string, unknown>),
          _senderId: session.username,
          _senderName: session.displayName,
        });
      }
    });

    // Join room — validate input + audit log
    socket.on("room:join", (roomId: unknown) => {
      if (typeof roomId !== "string") return;
      const trimmed = roomId.trim();
      if (!trimmed || trimmed.length > MAX_ROOM_ID_LENGTH) return;
      socket.join(trimmed);
    });

    // Send message — validate payload, enforce server-verified identity, check room membership
    socket.on("message:send", (msg: unknown) => {
      if (!msg || typeof msg !== "object") return;
      const raw = msg as Record<string, unknown>;

      const roomId = typeof raw.roomId === "string" ? raw.roomId.trim() : "";
      const text = typeof raw.text === "string" ? raw.text.trim() : "";
      // Server-generate id & time — never trust client values
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const time = new Date().toISOString();

      if (!roomId || !text) return;
      if (text.length > MAX_MESSAGE_TEXT_LENGTH) return;
      if (!socket.rooms.has(roomId)) return;

      const profiles = listAllCrewProfiles();
      const profile = profiles.get(session.username);
      const senderName = profile?.fullName || session.displayName;

      io.to(roomId).emit("message:receive", {
        id,
        roomId,
        senderId: session.username,
        senderName,
        text,
        time,
      });
    });

    // Typing indicator — use server-verified identity, throttled to 1 per 2s
    let lastTypingEmit = 0;
    socket.on("typing:start", (payload: unknown) => {
      if (!payload || typeof payload !== "object") return;
      const raw = payload as Record<string, unknown>;
      const roomId = typeof raw.roomId === "string" ? raw.roomId.trim() : "";
      if (!roomId || !socket.rooms.has(roomId)) return;
      const now = Date.now();
      if (now - lastTypingEmit < 2000) return;
      lastTypingEmit = now;
      socket
        .to(roomId)
        .emit("typing:start", { senderName: session.displayName, roomId });
    });
    socket.on("typing:stop", (payload: unknown) => {
      if (!payload || typeof payload !== "object") return;
      const raw = payload as Record<string, unknown>;
      const roomId = typeof raw.roomId === "string" ? raw.roomId.trim() : "";
      if (!roomId || !socket.rooms.has(roomId)) return;
      socket.to(roomId).emit("typing:stop", { roomId });
    });

    // ── Gemini Live Voice Proxy ──────────────────────────────────────────────
    let geminiSession: Session | null = null;
    // State flags — shared antara onmessage callback dan PTT handlers
    let turnCompleteSent = false;
    let firstChunkSent = false;
    let turnStartedAt = 0;

    // voice:start — use server-verified identity (ignore client payload)
    socket.on("voice:start", async () => {
      // Guard: close orphaned session if client reconnects quickly
      if (geminiSession) {
        try {
          geminiSession.close();
        } catch {
          /* ignore */
        }
        geminiSession = null;
      }
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        socket.emit("voice:error", "GEMINI_API_KEY tidak ada");
        return;
      }
      const sessionUser: AudreySessionUser = {
        username: session.username,
        displayName: session.displayName,
        profession: session.profession,
      };
      const preferredAddress = getAudreyPreferredAddress(sessionUser);

      try {
        const ai = new GoogleGenAI({ apiKey, apiVersion: "v1alpha" });
        geminiSession = await ai.live.connect({
          model: "gemini-2.5-flash-native-audio-preview-12-2025",
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
            },
            realtimeInputConfig: {
              // PTT mode: VAD dimatikan — dokter sendiri yang kontrol via audioStreamEnd
              automaticActivityDetection: { disabled: true },
            },
            inputAudioTranscription: {},
            systemInstruction: {
              parts: [
                {
                  text: buildAudreyCoreSystemPrompt({
                    user: sessionUser,
                    extraInstructions: `
## MODE SUARA — KONSULTASI VOICE

Ini adalah sesi voice real-time. Jawaban awal harus singkat, natural, dan terdengar seperti sejawat klinis yang sedang bicara langsung.
Gunakan 2-3 kalimat padat untuk respons pertama. Jika user minta detail, baru elaborasi lebih jauh.
Saat membuka sesi, sapa user dengan salam waktu yang tepat dan gunakan panggilan utama: "${preferredAddress}".
Jangan terdengar seperti presenter, MC, atau iklan. Hindari pembuka "Hei" atau "Hey".

## KONTEKS FASILITAS — PUSKESMAS BALOWERTI

- Nama: UPTD Puskesmas PONED Balowerti, Kota Kediri
- Kepala Puskesmas: drg. Endah Retno W.
- Layanan: pemeriksaan umum, gigi & mulut, KIA, gizi, imunisasi, KB, kesehatan jiwa, farmasi, VCT & IMS, laboratorium, TB & kusta, kesehatan lingkungan
- Keterbatasan penting: tidak ada CT scan, MRI, spesialis on-site, ICU, atau ventilator
- Sumber daya yang biasanya tersedia: lab dasar, EKG sederhana, oksimetri, dan obat esensial Fornas

Jika ada yang bilang "say hello buat audience" atau "sapa audience", jawab sebagai Audrey dengan sapaan singkat, ramah, dan profesional untuk forum Puskesmas Balowerti.
`.trim(),
                  }),
                },
              ],
            },
          },
          callbacks: {
            onopen: () => {
              socket.emit("voice:ready");
            },
            onmessage: (msg: {
              serverContent?: {
                modelTurn?: {
                  parts?: { inlineData?: { data?: string }; text?: string }[];
                };
                turnComplete?: boolean;
                interrupted?: boolean;
                inputTranscription?: { text?: string };
              };
            }) => {
              const content = msg?.serverContent;
              if (!content) return;
              const parts = content?.modelTurn?.parts ?? [];
              for (const part of parts) {
                if (part?.inlineData?.data) {
                  if (!firstChunkSent) {
                    firstChunkSent = true;
                    console.log(
                      `[Audrey] ⚡ first audio chunk — latency: ${Date.now() - turnStartedAt}ms`,
                    );
                  }
                  turnCompleteSent = false;
                  socket.emit("voice:audio", part.inlineData.data);
                }
                if (part?.text) {
                  socket.emit("voice:text", part.text);
                }
              }
              if (content?.inputTranscription?.text) {
                socket.emit("voice:user_text", content.inputTranscription.text);
              }
              if (content?.turnComplete && !turnCompleteSent) {
                turnCompleteSent = true;
                console.log(
                  `[Audrey] turn_complete — total: ${Date.now() - turnStartedAt}ms`,
                );
                socket.emit("voice:turn_complete");
              }
              if (content?.interrupted) {
                turnCompleteSent = false;
                firstChunkSent = false;
                socket.emit("voice:interrupted");
              }
            },
            onerror: (e: ErrorEvent) => {
              socket.emit("voice:error", e.message);
            },
            onclose: () => {
              socket.emit("voice:closed");
            },
          },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        socket.emit("voice:error", msg);
      }
    });

    socket.on(
      "voice:audio_chunk",
      async (payload: { data: string; mimeType: string } | string) => {
        if (!geminiSession) return;
        // Support format lama (string) dan baru (object dengan mimeType)
        const data = typeof payload === "string" ? payload : payload.data;
        const mimeType =
          typeof payload === "string"
            ? "audio/pcm;rate=16000"
            : payload.mimeType;
        try {
          await geminiSession.sendRealtimeInput({ audio: { data, mimeType } });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          socket.emit("voice:error", `Audio stream error: ${msg}`);
          geminiSession = null;
        }
      },
    );

    // PTT: dokter mulai bicara → reset flags + activityStart
    socket.on("voice:ptt_start", () => {
      if (!geminiSession) return;
      try {
        // Reset state flags untuk turn baru
        turnCompleteSent = false;
        firstChunkSent = false;
        turnStartedAt = Date.now();
        geminiSession.sendRealtimeInput({ activityStart: {} });
      } catch {
        /* ignore */
      }
    });

    // PTT: dokter selesai bicara → activityEnd → Gemini langsung generate
    socket.on("voice:end_turn", () => {
      if (!geminiSession) return;
      try {
        geminiSession.sendRealtimeInput({ activityEnd: {} });
      } catch {
        /* ignore */
      }
    });

    // Interrupt Audrey yang sedang berbicara → activityEnd
    socket.on("voice:interrupt", () => {
      if (!geminiSession) return;
      try {
        geminiSession.sendRealtimeInput({ activityEnd: {} });
      } catch {
        /* ignore */
      }
    });

    socket.on("voice:stop", async () => {
      if (geminiSession) {
        try {
          geminiSession.close();
        } catch {
          /* ignore */
        }
        geminiSession = null;
      }
    });

    // Disconnect — use server-verified session, scope broadcast to crew room
    socket.on("disconnect", () => {
      if (geminiSession) {
        try {
          geminiSession.close();
        } catch {
          /* ignore */
        }
        geminiSession = null;
      }
      onlineUsers.delete(session.username);
      io.to("crew").emit("users:online", Array.from(onlineUsers.values()));
    });
  });

  function startListening(port: number) {
    const host = process.env.HOST || "0.0.0.0";
    httpServer.listen(port, host, () => {
      const displayHost = host === "0.0.0.0" ? "localhost" : host;
      console.log(`▲ ACARS WebSocket Server ready on http://${displayHost}:${port}`);
    });
  }

  httpServer.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      const PORT = parseInt(process.env.PORT || "3000");
      const fallback = PORT + 1;
      console.log(`⚠ Port ${PORT} sibuk, mencoba ${fallback}...`);
      process.env.PORT = String(fallback);
      httpServer.removeAllListeners("error");
      startListening(fallback);
    } else {
      throw err;
    }
  });

  startListening(parseInt(process.env.PORT || "3000"));
});
