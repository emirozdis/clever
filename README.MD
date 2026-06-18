Here is a unified `README.md` that merges the two projects into a single, cohesive document. It is structured to accommodate the new monorepo layout, detailing both components (`clever-server` and `clever-services`) and how they interact.

***

# Clever AI - Unified Voice Assistant & API Services

Welcome to the unified repository for **Clever AI**. This project brings together the smart voice assistant interface and its supporting backend services into a single codebase.

## 📂 Project Structure

This repository is split into two primary directories:

*   **`./clever-server`**: The core Next.js frontend and orchestration layer. It handles user interactions, streams AI responses, and triggers external tools.
*   **`./clever-services`**: The API gateway, SQLite-based memory storage, SearXNG search proxy, and a service-health status dashboard.

---

## ✨ Features

### 🎙️ Clever Server (Voice Assistant)
*   **AI-Powered Conversations**: Natural language interactions driven by the Google Gemini Pro model.
*   **Dynamic Tool Integration**: Executes real-time tools based on conversational intent:
    *   **Web Search**: Pulls relevant search results via the local proxy.
    *   **Weather Updates**: Fetches real-time weather data using the Open-Meteo API.
    *   **Music Playback**: Searches and streams music via YouTube.
    *   **Contextual Memory**: Reads and writes user-specific facts for highly personalized responses.
    *   **Vision Retrieval**: Integrates with smartglasses for visual context.
*   **Streaming Responses**: Delivers fluid, real-time responses using Server-Sent Events (SSE).

### ⚙️ Clever Services (API Gateway & Dashboard)
*   **Unified API Gateway**: Acts as the centralized entry point for Clever Server's backend operations.
*   **Real-Time Status Dashboard**: Provides a visual interface to monitor response times, database connectivity, and SearXNG proxy health.
*   **Memory API**: Manages keyword-based persistence using a local SQLite database.
*   **Search Proxy API**: Proxies searches to a SearXNG instance and extracts text snippets from web pages.
*   **Secure Authentication**: Restricts API endpoints using a configurable authentication key.

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
*   **Node.js** (v18 or higher)
*   **npm** or **yarn**
*   **SearXNG** (Recommended to run via Docker on `http://localhost:8080`)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/emirozdis/clever-server.git
    cd clever-server
    ```

2.  **Install dependencies for both projects:**

    *For Clever Server:*
    ```bash
    cd clever-server
    npm install
    ```

    *For Clever Services:*
    ```bash
    cd ../clever-services
    npm install
    ```

---

## ⚙️ Environment Configuration

You will need to set up environment variables for both applications before starting them.

### 1. Clever Server Configuration (`./clever-server/.env.local`)
Create a `.env.local` file inside the `./clever-server` directory:

```env
GEMINI_API_KEY=YOUR_GOOGLE_GEMINI_API_KEY
AUTH_KEY=YOUR_CUSTOM_MEMORY_AND_SEARCH_API_KEY
YT_API_KEY=YOUR_YOUTUBE_DATA_API_KEY
SEARCH_API=YOUR_SEARXNG_INSTANCE_URL # e.g., https://searxng.example.com or your Clever Services API gateway URL
```
*   `GEMINI_API_KEY`: Obtain this from Google AI Studio.
*   `AUTH_KEY`: Must match the `AUTH_KEY` configured in `clever-services`.
*   `YT_API_KEY`: Obtain from the Google Cloud Console (YouTube Data API v3).

### 2. Clever Services Configuration (`./clever-services/.env.local`)
Create a `.env.local` file inside the `./clever-services` directory:

```env
AUTH_KEY="your_secret_api_key_here"
# Ensure your local SearXNG is running and accessible
# SEARXNG_URL="http://localhost:8080" 
```
*   `AUTH_KEY`: A strong, unique secret key used to secure incoming API requests.

---

## 🏃 Running the Applications

To run the complete environment, you must start both servers.

### Start the Services API Gateway & Dashboard
```bash
cd clever-services
npm run dev
# Dashboard runs on http://localhost:3000 (unless port conflicted)
```

### Start the Clever AI Voice Assistant
```bash
cd clever-server
npm run dev
# Assistant interface runs on http://localhost:3000 (or the next available port, e.g., 3001)
```

---

## 🛠️ System Architecture

```
                       ┌───────────────────┐
                       │   Clever Server   │ (Port 3001)
                       │   (Next.js App)   │
                       └─────────┬─────────┘
                                 │
                     HTTP (SSE)  │  Web Tools / API Requests
                                 ▼
                       ┌───────────────────┐
                       │  Clever Services  │ (Port 3000)
                       │   (API Gateway)   │
                       └────┬─────────┬────┘
                            │         │
                SQLite DB ◄─┘         └─► SearXNG Proxy (Docker)
```

1.  The **Clever Server** acts as the user interface. It communicates with Google Gemini and streams responses back to the client using Server-Sent Events (SSE).
2.  When the AI requests a tool execution (such as saving a memory or conducting a web search), **Clever Server** sends a request to **Clever Services**.
3.  **Clever Services** processes the request—either storing/retrieving facts from the local SQLite database or querying the SearXNG instance.

---

## 🔌 API Reference (Clever Services)

All endpoints (except health checks) require an `Authorization` or `X-Auth-Key` header with your configured `AUTH_KEY`.

### Memory API
*   **Search Memory**: `GET /api/memory?q={query}`
    *   *Example*: `GET /api/memory?q=important+note`
*   **Create Memory**: `POST /api/memory`
    *   *Body*: `{ "name": "string", "value": "string", "keywords": ["string"] }`
*   **Memory Health**: `GET /api/memory?health=true` (No authentication required)

### Search API
*   **Proxy Search**: `GET /api/search/{searxng_path}?{query_params}`
    *   *Example*: `GET /api/search/search?q=next.js+tutorial`
*   **Search Health**: `GET /api/search/health` (No authentication required)

---

## 🤝 Contributing

Contributions are welcome. If you encounter bugs or want to suggest enhancements, please open an issue or submit a pull request in this repository.
