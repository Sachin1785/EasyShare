# EasyShare

A real-time file sharing web application that allows users to create rooms and share files with others. Built with Flask and Socket.IO.

## Features

- Create private sharing rooms
- Real-time file transfer with chunk-based uploads
- Automatic ngrok tunnel for public access
- Persistent room data storage
- Join a room using a room code
- Auto-reconnect and request missing chunks

## Setup

1. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Create a `.env` file with your ngrok auth token (optional):
   ```
   NGROK_AUTH_TOKEN=your_token_here
   NGROK_DOMAIN=your_domain_here  # optional
   ```

3. Run the server:
   ```
   python server.py
   ```

## How It Works

The application uses WebSockets to handle real-time communication between clients. Files are split into chunks for efficient transfer and reassembled on the recipient's end.
