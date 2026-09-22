# DASSH: Dynamic AI-Powered Software Solutions Hub

![DASSH Logo Placeholder](https://via.placeholder.com/150x50?text=DASSH) **Imagine it. Describe it. Play it. Instantly.**

## About DASSH

DASSH is an open-source platform that converts natural-language prompts into playable HTML5 Canvas games instantly in sandboxed browser iframes. 

## Key Features

* **AI-Powered Game Creation:** Describe a game, and the AI writes the HTML5 Canvas code.
* **Bring Your Own Key (BYOK):** Zero-cost deployment architecture. Users securely input their Groq, Gemini, or OpenAI API keys into their browser `localStorage`.
* **Multi-LLM Fallback Dispatch:** Pooled async dispatch routing across Groq → Gemini → OpenAI with automatic failover to ensure high availability.
* **Secure Architecture:** Custom JWT authentication utilizing bcrypt password hashing and `httpOnly` secure cookies. Per-user rate limiting via SlowAPI prevents quota abuse.
* **Optimized Database:** PostgreSQL backend with asynchronous SQLAlchemy queries, eliminating N+1 bottlenecks to reduce database round trips from O(n) to O(2).

## Technologies Under the Hood

### Frontend Stack
* **React 18 & Vite:** Lightning-fast development with TypeScript.
* **Tailwind CSS & Shadcn/UI:** Beautiful, accessible UI components.
* **Sandboxed Iframes:** Secure client-side game rendering using `srcdoc` with zero external CDN dependencies.

### Backend Stack
* **FastAPI:** High-performance Python REST APIs.
* **PostgreSQL & SQLAlchemy (AsyncSession):** Asynchronous data access layer.
* **Pytest:** Integration tests executing in under 2 seconds via dependency-injection mocking.

## Getting Started (Docker Compose)

The easiest way to run DASSH locally is via Docker Compose, which spins up the React frontend (via NGINX), FastAPI backend, and PostgreSQL database automatically.

### Prerequisites
* Docker & Docker Compose installed on your system.

### Running the App
1. Clone the repository:
   ```bash
   git clone https://github.com/sauravraj2003/unity-example.git
   cd unity-example
   ```
2. Start the containers:
   ```bash
   docker compose up -d
   ```
3. Open your browser:
   * **Frontend:** [http://localhost:5174](http://localhost:5174)
   * **Backend API Docs:** [http://localhost:7700/docs](http://localhost:7700/docs)

## Security Check & Deployment

DASSH is designed to be deployed securely at zero cost (e.g., frontend on Vercel, backend on Render).

* **LLM API Keys:** LLM keys are never stored on the server or committed to the repository. They are passed securely via HTTP headers from the client.
* **JWT Secret:** Before deploying the backend to a production server, ensure you set a strong, random 64-character string as the `JWT_SECRET` environment variable!
