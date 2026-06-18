# Clever Services API Gateway & Status Dashboard

## Project Description

This project is a Next.js application that functions as an API gateway for various AI-related services, specifically a memory management API and a search proxy API. It also features a real-time, interactive status dashboard to monitor the health and performance of these integrated services.

## Features

*   **Unified API Gateway**: Provides a single entry point for interacting with underlying AI services.
*   **Real-time Status Dashboard**: Offers an intuitive, automatically refreshing dashboard to visualize the operational status, response times, and detailed health metrics of each service.
*   **Memory API**: Manages keyword-based memory storage and retrieval using a local SQLite database.
*   **Search API (SearXNG Proxy)**: Proxies requests to a local SearXNG instance, enhancing search results by extracting relevant text snippets from fetched web pages.
*   **Health Check Endpoints**: Dedicated endpoints for each service to report their current status, including database connectivity and external service reachability.
*   **Custom API Key Authentication**: Secures all API endpoints (excluding health checks) using a configurable API key.
*   **Detailed Error Reporting**: Provides comprehensive error messages and types for easier debugging and monitoring.

## Tech Stack

*   **Frontend**: Next.js, React, TypeScript, Tailwind CSS, Lucide React
*   **Backend**: Next.js API Routes, TypeScript, Node.js, `sqlite3`, `cheerio`
*   **Database**: SQLite
*   **Authentication**: Custom API Key Authentication
*   **Deployment**: Vercel (for Next.js application), Docker (recommended for SearXNG dependency)

## Getting Started

To get this project up and running locally, follow these steps:

### Prerequisites

*   Node.js (v18 or higher)
*   npm or Yarn
*   A running SearXNG instance (e.g., via Docker) accessible at `http://localhost:8080`.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/emirozdis/clever-services.git
    cd clever-services
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

### Environment Variables

Create a `.env.local` file in the root of the project and add the following:

```env
AUTH_KEY="your_secret_api_key_here"
# Ensure SearXNG is running and accessible at this URL
# SEARXNG_URL="http://localhost:8080" # (Currently hardcoded to localhost:8080 in src/app/api/search/[...path]/route.ts)
```

Replace `your_secret_api_key_here` with a strong, unique key. This key will be used to authenticate requests to the API endpoints.

### Running the Application

1.  **Start the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```

2.  Open your browser and navigate to `http://localhost:3000` to see the status dashboard.

## API Endpoints

All API endpoints require an `Authorization` header with your `AUTH_KEY` (e.g., `Authorization: your_secret_api_key_here`) or an `X-Auth-Key` header, unless specified otherwise.

### Memory API

*   **GET `/api/memory?q={query}`**: Searches for memory records based on keywords. Requires authentication.
    *   **Example**: `GET /api/memory?q=important+note`
*   **POST `/api/memory`**: Creates a new memory record. Requires authentication.
    *   **Body**: `{ "name": "string", "value": "string", "keywords": ["string"] }`
*   **GET `/api/memory?health=true`**: Health check endpoint. Does NOT require authentication.

### Search API

*   **GET `/api/search/{searxng_path}?{query_params}`**: Proxies requests to the configured SearXNG instance. Requires authentication.
    *   **Example**: `GET /api/search/search?q=next.js+tutorial`
*   **GET `/api/search/health`**: Health check endpoint for the SearXNG proxy. Does NOT require authentication.

## Health Checks

The dashboard automatically polls the `/api/memory?health=true` and `/api/search/health` endpoints to determine the status of the integrated services. These endpoints provide detailed information about the service's internal state, such as database connectivity for the Memory API or reachability of the SearXNG instance for the Search API.

## Contributing

Contributions are welcome! Please feel free to open issues or submit pull requests.

## License

This project is open-source and available under the [MIT License](LICENSE).