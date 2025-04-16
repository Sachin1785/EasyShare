# File Sharing Server with ngrok

This is a Flask-SocketIO based file sharing server that can be exposed to the internet using ngrok.

## Setup

1. Install the required dependencies:
   ```
   pip install flask flask-socketio eventlet pyngrok python-dotenv flask-cors
   ```

2. Create a `.env` file with your ngrok auth token and static domain:
   ```
   NGROK_AUTH_TOKEN=your_auth_token_here
   NGROK_DOMAIN=your-static-domain.ngrok-free.app
   ```

   You can get your auth token from the [ngrok dashboard](https://dashboard.ngrok.com/auth/your-authtoken).
   The free tier of ngrok includes one static domain which you can set up in your ngrok dashboard.

## Usage

1. Run the server:
   ```
   python server.py
   ```

2. The server will start on port 5000 and create an ngrok tunnel.
   - If you configured a static domain, it will use that domain.
   - Otherwise, it will create a random ngrok URL.

3. The ngrok URL will be displayed in the console, which you can share with others to connect to your file sharing server.

## Features

- Create a room to share files
- Join a room using a room code
- Transfer files in chunks
- Auto-reconnect and request missing chunks
- Persists room information to a JSON file 