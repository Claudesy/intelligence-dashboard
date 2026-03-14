// Architected and built by Claudesy.
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import dynamic from "next/dynamic";

const ACARS_PAGE_WIDTH = 1200;
const ACARS_PANEL_STYLE = {
  background: "transparent",
  border: "1px solid var(--line-base)",
  borderRadius: 12,
  boxShadow: "none",
} as const;

const DEFAULT_CENTER: [number, number] = [-7.8166, 112.0116]; // Puskesmas Balowerti

const StaffMap = dynamic(() => import("@/components/map/StaffMap"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(145deg, #1a1a1a, #0f0f0f)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#666",
        fontSize: 13,
        letterSpacing: "0.1em",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: "2px solid #E67E22",
          borderTopColor: "transparent",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
    </div>
  ),
});

// ─── Types ────────────────────────────────────────────────────────────────────
type OnlineUser = {
  userId: string;
  name: string;
  role: string;
  profession: string;
  institution: string;
  socketId: string;
};

type SessionUser = {
  username: string;
  displayName: string;
  fullName: string;
  role: string;
  profession: string;
  institution: string;
  email: string;
};

type ChatMessage = {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  text: string;
  time: string;
};

// ─── Utils ────────────────────────────────────────────────────────────────────
function now() {
  return new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getAvatarUrl(profession: string, role: string): string {
  const p = profession.toLowerCase();
  if (p.includes("dokter") || role === "DOKTER") return "/avatar/doctor-m.png";
  if (p.includes("perawat") || role === "PERAWAT") return "/avatar/nurse-m.png";
  if (p.includes("bidan") || role === "BIDAN") return "/avatar/nurse-w.png";
  if (p.includes("apoteker") || role === "APOTEKER")
    return "/avatar/pharmacy-m.png";
  return "/avatar/adm-m.png";
}

function getUserColor(role: string): string {
  switch (role) {
    case "DOKTER":
      return "#D47A57";
    case "PERAWAT":
      return "#5B8DB8";
    case "BIDAN":
      return "#A87BBE";
    case "APOTEKER":
      return "#5B9E8F";
    case "ADMINISTRATOR":
      return "#E67E22";
    default:
      return "#888";
  }
}

// ─── Components ───────────────────────────────────────────────────────────────
function OnlineIndicator({ isOnline }: { isOnline: boolean }) {
  return (
    <div
      style={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: isOnline ? "#4ADE80" : "#666",
        boxShadow: isOnline ? "0 0 8px #4ADE80" : "none",
        animation: isOnline ? "pulse 2s infinite" : "none",
        border: "2px solid #1a1a1a",
      }}
    />
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AcarsPage() {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const messagesListRef = useRef<HTMLDivElement>(null);

  // Fetch session + connect socket
  useEffect(() => {
    let socket: Socket | null = null;

    async function init() {
      try {
        const res = await fetch("/api/auth/profile", { cache: "no-store" });
        const data = await res.json();
        const src = data.user;
        if (!data.ok || !src) return;

        const profileFullName = data.profile?.fullName || "";
        const session: SessionUser = {
          username: src.username,
          displayName: src.displayName,
          fullName: profileFullName || src.displayName,
          role: src.role,
          profession: src.profession || "",
          institution: src.institution || "",
          email: src.email || "",
        };
        setCurrentUser(session);

        socket = io();
        socketRef.current = socket;

        socket.on("connect", () => {
          setConnected(true);
          // Join broadcast room immediately on connect
          socket!.emit("room:join", "broadcast");
          socket!.emit("user:join", {
            userId: session.username,
            name: session.displayName,
            role: session.role,
            profession: session.profession,
            institution: session.institution,
          });
        });

        socket.on("disconnect", () => setConnected(false));

        socket.on("users:online", (users: OnlineUser[]) => {
          setOnlineUsers(users);
        });

        socket.on("message:receive", (msg: ChatMessage) => {
          // Skip own messages (already added locally in sendMessage)
          if (msg.senderId === session.username) return;
          setMessages((prev) => [...prev, msg]);
          setUnreadCount((c) => c + 1);
        });
      } catch {
        // session fetch failed — page still renders
      }
    }

    init();

    return () => {
      if (socket) {
        socket.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (messages.length === 0) return;
    const container = messagesListRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages]);

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text || !socketRef.current || !currentUser) return;

    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      roomId: "broadcast",
      senderId: currentUser.username,
      senderName: currentUser.fullName,
      text,
      time: now(),
    };

    socketRef.current.emit("message:send", msg);
    setMessages((prev) => [...prev, msg]);
    setInput("");
  }, [input, currentUser]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // Build staff locations for map from online users
  const staffLocations = onlineUsers.map((u) => ({
    id: u.userId,
    name: u.name,
    role: u.profession || u.role,
    institution: u.institution || "Puskesmas Balowerti Kota Kediri",
    isOnline: true,
    gender: "male" as const,
    avatarUrl: getAvatarUrl(u.profession, u.role),
    location: {
      lat: DEFAULT_CENTER[0] + (Math.random() - 0.5) * 0.0004,
      lng: DEFAULT_CENTER[1] + (Math.random() - 0.5) * 0.0004,
      label: u.institution || "Puskesmas",
    },
    color: getUserColor(u.role),
  }));

  const myColor = currentUser ? getUserColor(currentUser.role) : "#E67E22";
  const myAvatar = currentUser
    ? getAvatarUrl(currentUser.profession, currentUser.role)
    : "/avatar/adm-m.png";

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
      }}
    >
      {/* Global CSS */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Header */}
      <div
        className="page-header"
        style={{
          maxWidth: ACARS_PAGE_WIDTH,
          width: "100%",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div className="page-title">ACARS</div>
          <div className="page-subtitle">
            Active communication and coordination radar system untuk kolaborasi
            klinis internal.
          </div>
          <div className="page-header-divider" />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Connection Status */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              background: "rgba(255,255,255,0.02)",
              borderRadius: 6,
              border: "1px solid var(--line-base)",
            }}
          >
            <OnlineIndicator isOnline={connected} />
            <span
              style={{
                fontSize: 11,
                letterSpacing: "0.1em",
                color: connected ? "#4ADE80" : "#666",
              }}
            >
              {connected ? "LIVE" : "OFFLINE"}
            </span>
          </div>

          {/* User Info */}
          {currentUser && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  overflow: "hidden",
                  flexShrink: 0,
                  border: `2px solid ${myColor}`,
                  background: "var(--bg-nav)",
                }}
              >
                <img
                  src={myAvatar}
                  alt=""
                  width={40}
                  height={40}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--text-main)",
                  }}
                >
                  {currentUser.fullName}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    letterSpacing: "0.1em",
                  }}
                >
                  {currentUser.profession || currentUser.role}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map Section */}
      <div
        style={{
          maxWidth: ACARS_PAGE_WIDTH,
          width: "100%",
          height: 450,
          overflow: "hidden",
          ...ACARS_PANEL_STYLE,
        }}
      >
        <StaffMap staff={staffLocations} center={DEFAULT_CENTER} zoom={19} />
      </div>

      {/* User List / SCARS Directory */}
      <div
        style={{
          maxWidth: ACARS_PAGE_WIDTH,
          width: "100%",
          ...ACARS_PANEL_STYLE,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--line-base)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.12em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
            }}
          >
            SCARS DIRECTORY // {onlineUsers.length} ONLINE
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              letterSpacing: "0.08em",
            }}
          >
            {new Date()
              .toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
              .toUpperCase()}
          </div>
        </div>

        {/* Table Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "280px 1fr 200px 150px 120px",
            gap: 16,
            padding: "12px 20px",
            borderBottom: "1px solid var(--line-base)",
          }}
        >
          {["Name", "Profesi", "Institusi", "Status", "Jam Online"].map(
            (h, i) => (
              <span
                key={h}
                style={{
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  textAlign: i === 4 ? "right" : undefined,
                }}
              >
                {h}
              </span>
            ),
          )}
        </div>

        {/* User Rows */}
        {onlineUsers.length === 0 && (
          <div
            style={{
              padding: "32px 20px",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 14,
            }}
          >
            Belum ada crew online
          </div>
        )}
        {onlineUsers.map((user) => {
          const color = getUserColor(user.role);
          const avatar = getAvatarUrl(user.profession, user.role);
          const isMe = currentUser?.username === user.userId;
          return (
            <div
              key={user.userId}
              style={{
                display: "grid",
                gridTemplateColumns: "280px 1fr 200px 150px 120px",
                gap: 16,
                padding: "16px 20px",
                alignItems: "center",
                background: isMe ? "rgba(255,255,255,0.03)" : "transparent",
                borderLeft: `2px solid ${isMe ? "var(--c-asesmen)" : "transparent"}`,
                borderBottom: "1px solid rgba(255,255,255,0.03)",
              }}
            >
              {/* Name */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: `2px solid ${color}`,
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={avatar}
                    width={44}
                    height={44}
                    style={{ objectFit: "cover" }}
                    alt=""
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--text-main)",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {user.name}{" "}
                    {isMe && (
                      <span
                        style={{ fontSize: 11, color: "var(--text-muted)" }}
                      >
                        (you)
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      letterSpacing: "0.05em",
                      marginTop: 2,
                    }}
                  >
                    @{user.userId}
                  </div>
                </div>
              </div>

              {/* Profesi */}
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-main)",
                  letterSpacing: "0.03em",
                }}
              >
                {user.profession || user.role}
              </div>

              {/* Institusi */}
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: "0.08em",
                  color: "var(--text-muted)",
                }}
              >
                {user.institution || "—"}
              </div>

              {/* Status */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 10px",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: 4,
                  border: "1px solid rgba(74,222,128,0.25)",
                  width: "fit-content",
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#4ADE80",
                    boxShadow: "0 0 6px #4ADE80",
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    color: "#4ADE80",
                  }}
                >
                  ONLINE
                </span>
              </div>

              {/* Jam Online */}
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: "0.08em",
                  color: "#4ADE80",
                  textAlign: "right",
                }}
              >
                {now()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Broadcast Chat Section */}
      <div
        style={{
          maxWidth: ACARS_PAGE_WIDTH,
          width: "100%",
          ...ACARS_PANEL_STYLE,
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          minHeight: 280,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
            paddingBottom: 12,
            borderBottom: "1px solid var(--line-base)",
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "var(--text-muted)",
            }}
          >
            BROADCAST
          </span>
          {unreadCount > 0 && (
            <span
              style={{
                padding: "2px 8px",
                background: myColor,
                borderRadius: 10,
                fontSize: 11,
                color: "#fff",
              }}
            >
              {unreadCount}
            </span>
          )}
        </div>

        {/* Messages */}
        <div
          ref={messagesListRef}
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 12,
            paddingRight: 4,
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: 15,
                padding: "40px 0",
              }}
            >
              Belum ada pesan broadcast
            </div>
          )}
          {messages.map((msg) => {
            const isMe = currentUser && msg.senderId === currentUser.username;
            return (
              <div
                key={msg.id}
                style={{
                  padding: "10px 14px",
                  background: isMe
                    ? "rgba(255,255,255,0.02)"
                    : "rgba(255,255,255,0.01)",
                  borderRadius: 8,
                  borderLeft: isMe
                    ? `2px solid ${myColor}`
                    : "2px solid transparent",
                  border: "1px solid var(--line-base)",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: isMe ? myColor : "#888",
                    marginBottom: 4,
                  }}
                >
                  {isMe ? "You" : msg.senderName} · {msg.time}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-main)" }}>
                  {msg.text}
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentUser ? "Kirim broadcast..." : "Login dulu..."}
            disabled={!currentUser}
            style={{
              flex: 1,
              padding: "12px 16px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--line-base)",
              borderRadius: 8,
              color: "var(--text-main)",
              fontSize: 15,
              outline: "none",
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || !currentUser}
            style={{
              padding: "12px 24px",
              background: input.trim()
                ? "rgba(255,255,255,0.02)"
                : "rgba(255,255,255,0.01)",
              border: `1px solid ${input.trim() ? myColor : "var(--line-base)"}`,
              borderRadius: 8,
              color: input.trim() ? myColor : "var(--text-muted)",
              fontSize: 12,
              letterSpacing: "0.08em",
              cursor: input.trim() ? "pointer" : "not-allowed",
              opacity: input.trim() ? 1 : 0.5,
            }}
          >
            KIRIM
          </button>
        </div>
      </div>
    </div>
  );
}
