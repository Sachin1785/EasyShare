from flask import Flask, request
from flask_socketio import SocketIO, join_room, emit
import eventlet
import json
import os
from pyngrok import ngrok, conf
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

def setup_ngrok():
    ngrok_auth_token = os.environ.get("NGROK_AUTH_TOKEN", "")
    if ngrok_auth_token:
        conf.get_default().auth_token = ngrok_auth_token
        
        ngrok_domain = os.environ.get("NGROK_DOMAIN", "")
        
        if ngrok_domain:
            print(f" * Using static ngrok domain: {ngrok_domain}")
            public_url = ngrok.connect(5000, domain=ngrok_domain)
        else:
            public_url = ngrok.connect(5000)
            
        print(f" * ngrok tunnel available at: {public_url}")
        return public_url
    else:
        print(" * NGROK_AUTH_TOKEN not provided, running without ngrok")
        return None

if __name__ == '__main__':
    ngrok_url = setup_ngrok()
    socketio.run(app, host="0.0.0.0", port=5000, debug=False)