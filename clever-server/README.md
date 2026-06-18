# Clever AI - Your Smart Voice Assistant

Clever AI is an intelligent voice assistant designed to provide dynamic and contextual responses by leveraging the power of Google Gemini and a suite of integrated tools. Built with Next.js, it offers a seamless conversational experience, capable of performing various tasks from web searches to playing music.

## ✨ Features

*   **AI-Powered Conversations**: Engage in natural language interactions powered by the Google Gemini Pro model.
*   **Dynamic Tool Integration**: Utilizes a range of tools to fulfill requests:
    *   **Web Search**: Performs searches using SearxNG to provide up-to-date information.
    *   **Weather Updates**: Fetches current weather conditions for specified locations via Open-Meteo.
    *   **Music Playback**: Searches and plays music through YouTube.
    *   **Contextual Memory**: Saves and retrieves user-specific facts and preferences for personalized interactions.
    *   **Vision Retrieval**: Integrates with smartglasses to retrieve visual data when connected.
*   **Smartglasses Support**: Adapts its capabilities based on whether smartglasses are connected, enabling unique interactions like vision retrieval.
*   **Streaming Responses**: Delivers real-time AI responses using Server-Sent Events (SSE) for a fluid conversational flow.
*   **Modern Web Stack**: Built with Next.js, React, TypeScript, and styled with Tailwind CSS.

## 🚀 Getting Started

To get Clever AI up and running on your local machine, follow these steps:

### Prerequisites

Ensure you have Node.js (v18 or higher) and npm/yarn installed.

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/emirozdis/clever-server.git
    cd clever-server
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Environment Variables:**

    Create a `.env.local` file in the root directory and add your API keys:

    ```env
    GEMINI_API_KEY=YOUR_GOOGLE_GEMINI_API_KEY
    AUTH_KEY=YOUR_CUSTOM_MEMORY_AND_SEARCH_API_KEY
    YT_API_KEY=YOUR_YOUTUBE_DATA_API_KEY
    SEARCH_API=YOUR_SEARXNG_INSTANCE_URL # e.g., https://searxng.example.com
    ```

    *   `GEMINI_API_KEY`: Obtain this from Google AI Studio.
    *   `AUTH_KEY`: This key is used for the custom memory API and potentially your SearxNG instance.
    *   `YT_API_KEY`: Obtain this from the Google Cloud Console for YouTube Data API v3.
    *   `SEARCH_API`: The base URL for your SearxNG instance.

### Running the Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 🛠️ Architecture Overview

Clever AI utilizes a Next.js frontend for its user interface and an API route (`/api/ask`) to handle AI interactions. This API route acts as a central hub, forwarding user messages to the Google Gemini model. Based on the AI's response, it intelligently calls various external tool functions (e.g., `get_weather`, `web_search`, `play_music`, `save_memory`, `retrieve_vision`). Responses from the AI and tool executions are streamed back to the client using Server-Sent Events (SSE), ensuring a dynamic and responsive user experience.

## 🤝 Contributing

Contributions are welcome! If you have suggestions for improvements or new features, please open an issue or submit a pull request.

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.