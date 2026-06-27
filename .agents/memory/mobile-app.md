---
name: LeadForge Mobile App
description: Expo mobile companion at artifacts/mobile/ — architecture decisions and env var requirements
---

# LeadForge Mobile App

## Architecture
- Fully standalone personal-use app — no backend required
- AsyncStorage (via `@react-native-async-storage/async-storage`) for all data persistence
- Direct AI calls from the mobile app (not proxied through Next.js)
- AppContext provider wraps all shared state (leads, inbox, tasks)

## AI Integration
- EXPO_PUBLIC_GEMINI_API_KEY → Gemini 1.5 Flash (primary)
- EXPO_PUBLIC_GROQ_API_KEY → Llama 3.1 8B (fallback)
- EXPO_PUBLIC_GEMINI_MODEL / EXPO_PUBLIC_GROQ_MODEL for model override
- `lib/ai.ts` handles the Gemini → Groq → fallback chain

**Why:** Keys must be EXPO_PUBLIC_ prefix to be available at runtime in Expo. Server-side secrets (GEMINI_API_KEY) are NOT accessible in Expo Go. User must add these as separate EXPO_PUBLIC_ Replit secrets.

## Screens
- `app/(tabs)/index.tsx` — Dashboard (stats, recent leads, pending tasks)
- `app/(tabs)/leads.tsx` — Lead management (add, advance stage, delete, search)
- `app/(tabs)/chat.tsx` — AI Chat (inverted FlatList, Gemini/Groq, quick prompts)
- `app/(tabs)/inbox.tsx` — Inbox (log replies, AI reply generation, mark replied)

## Tab Layout
- Uses simple classic Tabs (not NativeTabs/liquid glass) — more stable across platforms
- NativeTabs was removed because SymbolView and expo-router/unstable-native-tabs caused white screen on web preview

## Theme
- Background: #110718 (deep plum)
- Primary: #d946ef (fuchsia)  
- Accent: #f59e0b (amber)
- Card: #1c0f2a (plum light)
- Only dark mode (userInterfaceStyle: "dark" in app.json)
