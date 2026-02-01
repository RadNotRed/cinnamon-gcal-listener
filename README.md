# Google Calendar Listener

A robust service that listens for real-time changes on specified Google Calendars and snapshots events to a PostgreSQL database. Built with Bun, TypeScript, and Docker.

## Features

- **Real-time Monitoring**: Uses Google Calendar Push Notifications (Webhooks) to detect changes instantly.
- **Data Persistence**: Stores calendar sync state and event snapshots in PostgreSQL.
- **Dockerized**: specific container support for easy deployment.
- **Bun Runtime**: Fast execution and package management.

## Prerequisites

- [Bun](https://bun.sh) (v1.0+)
- [Docker](https://www.docker.com/) & Docker Compose
- Google Cloud Project with:
  - Calendar API enabled
  - Service Account created with access to the target calendars
  - Service Account Key (JSON)

## Configuration

Create a `.env` file in the root directory:

```env
# Google Calendar Configuration
LOGGED_CAL_IDS=calendar_id_1@group.calendar.google.com,calendar_id_2@group.calendar.google.com
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Webhook Configuration
# Must be HTTPS and publicly accessible (use ngrok for local dev)
WEBHOOK_BASE_URL=https://your-domain.com

# Database Configuration
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=calendar_listener

# Application
PORT=3000
```

## Running the Application

### 🐳 Using Docker (Recommended)

The Docker setup handles the application and database. Note that `docker-compose.yml` maps host port **49427** to container port **3000**.

1.  Start the services:

    ```bash
    docker-compose up --build
    ```

2.  The application will be available at `http://localhost:49427`.

### ⚡ Running Locally

1.  Install dependencies:

    ```bash
    bun i
    ```

2.  Ensure you have a PostgreSQL database running and update `.env` `POSTGRES_HOST` to `localhost`.

3.  Start the development server:
    ```bash
    bun run dev
    ```

## Development

- **Build**: `bun run build` (if needed, though Bun runs TS natively)
- **Start**: `bun start`
