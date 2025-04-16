from flask import Flask, request
from flask_socketio import SocketIO, join_room, emit
import eventlet
import json
import os
from dotenv import load_dotenv
from flask_cors import CORS

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, 
                   cors_allowed_origins="*", 
                   async_mode='eventlet', 
                   ping_timeout=60,
                   ping_interval=25)

ROOMS_FILE = 'rooms.json'

# Load rooms from file
def load_rooms():
    if os.path.exists(ROOMS_FILE):
        with open(ROOMS_FILE, 'r') as f:
            return json.load(f)
    return {}

# Save rooms to file
def save_rooms():
    with open(ROOMS_FILE, 'w') as f:
        json.dump(rooms, f)

rooms = load_rooms()

@app.route('/')
def index():
    return "File Sharing Server Running"

@socketio.on('create_room')
def create_room(data):
    room_code = data['room']
    files = data['files']
    rooms[room_code] = {"files": files, "sender": request.sid, "recipients": {}}
    join_room(room_code)
    emit('room_created', {'room': room_code}, room=request.sid)
    save_rooms()

@socketio.on('join_room')
def join_room_event(data):
    room_code = data['room']
    if room_code in rooms:
        join_room(room_code)
        rooms[room_code]['recipients'][request.sid] = []
        emit('file_list', {'files': rooms[room_code]['files'], 'room': room_code}, room=request.sid)
    else:
        emit('error', {'message': 'Room not found'})
    save_rooms()

@socketio.on('request_missing_chunks')
def request_missing_chunks(data):
    room_code = data['room']
    if not room_code or room_code not in rooms:
        print(f"Invalid room code: {room_code}")
        return  
    file_index = data['file_index']
    received_indexes = data['receivedIndexes']

    sender_sid = rooms[room_code]["sender"]
    emit('send_missing_chunks', {
        'file_index': file_index,
        'missing_chunks': received_indexes,
        'recipient': request.sid
    }, room=sender_sid)
    save_rooms()

@socketio.on('chunk_transfer')
def chunk_transfer(data):
    room_code = data['room']
    if 'recipient' in data and data['recipient']:
        recipient_sid = data['recipient']
        emit('receive_chunk', data, room=recipient_sid)
    else:
        emit('receive_chunk', data, room=room_code, include_self=False)
    save_rooms()

@socketio.on('confirm_file_received')
def confirm_file_received(data):
    room_code = data['room']
    file_index = data['file_index']
    
    if room_code in rooms:
        sender_sid = rooms[room_code]['sender']
        emit('file_confirmed', {
            'file_index': file_index,
            'recipient': request.sid
        }, room=sender_sid)
    save_rooms()

@socketio.on('disconnect')
def handle_disconnect():
    for room, details in rooms.items():
        if request.sid == details.get('sender'):
            emit('room_closed', {}, room=room)
            del rooms[room]
            break
    save_rooms()

if __name__ == '__main__':
    # Get port from environment variable or default to 5000
    port = int(os.environ.get("PORT", 5000))
    # Use host 0.0.0.0 to make it publicly accessible
    socketio.run(app, host="0.0.0.0", port=port, debug=False)