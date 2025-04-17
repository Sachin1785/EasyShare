from flask import Flask, request
from flask_socketio import SocketIO, join_room, emit
import eventlet
from pyngrok import ngrok, conf
from dotenv import load_dotenv
from flask_cors import CORS
from pymongo import MongoClient
import os

# Load environment variables
load_dotenv()

# Flask app setup
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# SocketIO setup
socketio = SocketIO(app,
                   cors_allowed_origins="*",
                   async_mode='eventlet',
                   ping_timeout=60,
                   ping_interval=25)

# MongoDB setup
MONGO_URI = os.environ.get("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client['file_sharing']
rooms_collection = db['rooms']

# Helper functions
def get_room(room_code):
    return rooms_collection.find_one({"_id": room_code})

def create_or_update_room(room_code, data):
    rooms_collection.update_one({"_id": room_code}, {"$set": data}, upsert=True)

def delete_room(room_code):
    rooms_collection.delete_one({"_id": room_code})

# Root route
@app.route('/')
def index():
    return "File Sharing Server Running"

# Socket.IO events

@socketio.on('create_room')
def create_room(data):
    room_code = data['room']
    files = data['files']
    room_data = {
        "_id": room_code,
        "files": files,
        "sender": request.sid,
        "recipients": {}
    }
    create_or_update_room(room_code, room_data)
    join_room(room_code)
    emit('room_created', {'room': room_code}, room=request.sid)

@socketio.on('join_room')
def join_room_event(data):
    room_code = data['room']
    room = get_room(room_code)
    if room:
        join_room(room_code)
        room['recipients'][request.sid] = []
        create_or_update_room(room_code, room)
        emit('file_list', {'files': room['files'], 'room': room_code}, room=request.sid)
    else:
        emit('error', {'message': 'Room not found'})

@socketio.on('request_missing_chunks')
def request_missing_chunks(data):
    room_code = data['room']
    room = get_room(room_code)
    if not room:
        print(f"Invalid room code: {room_code}")
        return
    file_index = data['file_index']
    received_indexes = data['receivedIndexes']
    sender_sid = room['sender']
    emit('send_missing_chunks', {
        'file_index': file_index,
        'missing_chunks': received_indexes,
        'recipient': request.sid
    }, room=sender_sid)

@socketio.on('chunk_transfer')
def chunk_transfer(data):
    if 'recipient' in data and data['recipient']:
        # direct to one recipient
        emit('receive_chunk', data, room=data['recipient'])
    else:
        # broadcast to all in room except sender
        emit('receive_chunk', data, room=data['room'], include_self=False)

@socketio.on('confirm_file_received')
def confirm_file_received(data):
    room_code = data['room']
    file_index = data['file_index']
    room = get_room(room_code)
    if room:
        emit('file_confirmed', {
            'file_index': file_index,
            'recipient': request.sid
        }, room=room['sender'])

@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid

    # 1) Close & delete every room where this socket was the sender
    sender_rooms = list(rooms_collection.find({"sender": sid}))
    for room in sender_rooms:
        # notify any connected clients that the room is closed
        emit('room_closed', {}, room=room['_id'])
        # remove the room document from MongoDB
        rooms_collection.delete_one({"_id": room['_id']})

    # 2) Remove this socket from any recipients lists in other rooms
    rooms_collection.update_many(
        {f"recipients.{sid}": {"$exists": True}},
        {"$unset": {f"recipients.{sid}": ""}}
    )


# Run server
if __name__ == '__main__':
    # ngrok_url = setup_ngrok()   # if you need ngrok, uncomment this
    socketio.run(app, host="0.0.0.0", port=5000, debug=False)
