import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { openDB } from 'idb';
import { cn } from "./lib/utils.js";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./components/ui/card";
import { Label } from "./components/ui/label";
import { useToast } from "./components/ui/use-toast";
import { Toaster } from "./components/ui/toaster";
import Header from "./components/layout/Header";
import FileUpload from "./components/FileUpload";
import FileItem from "./components/FileItem";
import RoomInfo from "./components/RoomInfo";
import { Download, File } from "lucide-react";
import { Progress } from "./components/ui/progress";

const socket = io("https://easyshare-utuz.onrender.com", {
  withCredentials: false,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});
// const socket = io("http://localhost:5000");
const CHUNK_SIZE = 256 * 1024; // 256 KB

// Initialize IndexedDB
const initDB = async () => {
  return openDB('fileShareDB', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('chunks')) {
        db.createObjectStore('chunks', { keyPath: ['fileIndex', 'chunkIndex'] });
      }
    },
  });
};

const saveChunkToDB = async (fileIndex, chunkIndex, chunk) => {
  const db = await initDB();
  await db.put('chunks', { fileIndex, chunkIndex, chunk });
};

const getChunksFromDB = async (fileIndex) => {
  const db = await initDB();
  const chunks = await db.getAll('chunks');
  return chunks.filter(c => c.fileIndex === fileIndex);
};

function App() {
  const [room, setRoom] = useState("");
  const [files, setFiles] = useState([]);
  const [receivedChunks, setReceivedChunks] = useState({});
  const [isCreator, setIsCreator] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState({});
  const [confirmedFiles, setConfirmedFiles] = useState({});
  const [joinRoomInput, setJoinRoomInput] = useState("");
  const { toast } = useToast();
  const [isTransferring, setIsTransferring] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");

  const handleFileSelect = (newFiles) => {
    // If empty array is passed, clear all files (used by "Clear All" button)
    if (newFiles.length === 0) {
      setFiles([]);
      return;
    }
    
    // Otherwise append new files to existing files
    setFiles(prevFiles => [...prevFiles, ...newFiles]);
  };

  const removeFile = (index) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
    toast({
      title: "File removed",
      description: "File has been removed from the list",
    });
  };

  const createRoom = () => {
    if (files.length === 0) {
      toast({
        title: "Error",
        description: "Please select files first",
        variant: "destructive",
      });
      return;
    }
    const roomCode = Math.random().toString(36).substring(2, 8);
    setRoom(roomCode);
    setIsCreator(true);
    socket.emit("create_room", {
      room: roomCode,
      files: files.map(f => ({ name: f.name, size: f.size }))
    });
    toast({
      title: "Room created",
      description: "Share the room code with recipients",
    });
  };

  const joinRoom = async () => {
    if (!joinRoomInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a room code",
        variant: "destructive",
      });
      return;
    }
    setRoom(joinRoomInput);
    setIsCreator(false);
    socket.emit("join_room", { room: joinRoomInput });
    toast({
      title: "Joining room",
      description: "Please wait...",
    });
  };

  const sendFileChunks = () => {
    setProgress({});
    setIsTransferring(true);
    
    files.forEach((file, fileIndex) => {
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      let chunksSent = 0;
      const reader = new FileReader();

      reader.onload = (e) => {
        const fileData = e.target.result;
        for (let offset = 0; offset < file.size; offset += CHUNK_SIZE) {
          const chunk = fileData.slice(offset, offset + CHUNK_SIZE);
          socket.emit("chunk_transfer", {
            room,
            file_index: fileIndex,
            chunk_index: offset / CHUNK_SIZE,
            chunk,
          });
          chunksSent++;
          setProgress(prev => ({
            ...prev,
            [fileIndex]: (chunksSent / totalChunks) * 100
          }));
          
          if (chunksSent === totalChunks) {
            setIsTransferring(false);
          }
        }
      };

      reader.readAsArrayBuffer(file);
      toast({
        title: "Sending files",
        description: `Sending ${file.name}...`,
      });
    });
  };

  const confirmFileReceived = (fileIndex) => {
    if (!room) return;
    
    socket.emit('confirm_file_received', {
      room,
      file_index: fileIndex
    });
    
    toast({
      title: "File Download Complete",
      description: `Confirmed receipt of ${files[fileIndex].name}`,
    });
  };

  const downloadFile = (fileIndex) => {
    const chunksObj = receivedChunks[fileIndex];
    if (!chunksObj) return;
    const sortedIndices = Object.keys(chunksObj).sort((a, b) => a - b);
    const chunks = sortedIndices.map(i => chunksObj[i]);
    const blob = new Blob(chunks, { type: 'application/octet-stream' });
    const fileName = files[fileIndex]?.name || 'downloaded_file';
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
    
    confirmFileReceived(fileIndex);
    
    toast({
      title: "Download started",
      description: `Downloading ${fileName}`,
    });
  };

  const downloadAll = () => {
    const downloadableFiles = files.filter((_, index) => progress[index] === 100);
    
    if (downloadableFiles.length === 0) {
      toast({
        title: "Nothing to download",
        description: "No completed files available for download",
        variant: "destructive",
      });
      return;
    }
    
    files.forEach((file, index) => {
      if (progress[index] === 100) {
        downloadFile(index);
      }
    });
    
    toast({
      title: "Downloading all files",
      description: `${downloadableFiles.length} files will be downloaded`,
    });
  };

  const leaveRoom = () => {
    setRoom("");
    setFiles([]);
    setProgress({});
    setReceivedChunks({});
    toast({
      title: "Left room",
      description: "You have left the room",
    });
  };

  useEffect(() => {
    // Add connection event handlers
    socket.on("connect", () => {
      setConnectionStatus("connected");
      toast({
        title: "Connected",
        description: "Connected to server successfully",
      });
    });

    socket.on("connect_error", (error) => {
      setConnectionStatus("error");
      console.error("Connection error:", error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to server: " + error.message,
        variant: "destructive",
      });
    });

    socket.on("disconnect", (reason) => {
      setConnectionStatus("disconnected");
      toast({
        title: "Disconnected",
        description: "Disconnected from server: " + reason,
        variant: "destructive",
      });
    });

    socket.on("room_created", (data) => {
      setRoom(data.room);
      toast({
        title: "Room created",
        description: "Room created successfully!",
      });
    });

    socket.on("file_list", async (data) => {
      setRoom(data.room);
      setFiles(data.files);
      toast({
        title: "Connected",
        description: "Connected to room. Receiving files...",
      });
      
      for (let i = 0; i < data.files.length; i++) {
        const receivedChunks = await getChunksFromDB(i);
        const receivedIndexes = receivedChunks.map(c => c.chunkIndex);
        socket.emit("request_missing_chunks", { 
          room: data.room,
          file_index: i, 
          receivedIndexes 
        });
      }
    });

    socket.on('file_confirmed', (data) => {
      const { file_index, recipient } = data;
      setConfirmedFiles(prev => {
        const updated = { ...prev };
        if (!updated[file_index]) updated[file_index] = new Set();
        updated[file_index].add(recipient);
        return updated;
      });
      
      toast({
        title: "Transfer Confirmed",
        description: `File has been successfully received by a recipient`,
      });
    });

    socket.on("receive_chunk", async (data) => {
      const { file_index, chunk_index, chunk } = data;
      await saveChunkToDB(file_index, chunk_index, chunk);
      
      setReceivedChunks(prev => {
        const updatedChunks = { ...prev };
        if (!updatedChunks[file_index]) updatedChunks[file_index] = {};
        updatedChunks[file_index][chunk_index] = chunk;
        
        const file = files[file_index];
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const receivedCount = Object.keys(updatedChunks[file_index]).length;
        
        setProgress(prev => ({
          ...prev,
          [file_index]: (receivedCount / totalChunks) * 100
        }));
        
        if (receivedCount === totalChunks && !isCreator) {
          confirmFileReceived(file_index);
        }

        return updatedChunks;
      });
    });

    socket.on("error", (data) => {
      toast({
        title: "Error",
        description: data.message,
        variant: "destructive",
      });
    });

    return () => {
      socket.off("connect");
      socket.off("connect_error");
      socket.off("disconnect");
      socket.off("room_created");
      socket.off("file_list");
      socket.off("receive_chunk");
      socket.off("file_confirmed");
      socket.off("error");
    };
  }, [files, toast, isCreator, room]);

  // Calculate overall transfer progress
  const calculateOverallProgress = () => {
    if (files.length === 0) return 0;
    const total = files.length;
    const completedValues = Object.values(progress);
    
    if (completedValues.length === 0) return 0;
    
    return completedValues.reduce((sum, val) => sum + val, 0) / total;
  };

  // Determine if all files are ready for download
  const allFilesComplete = files.length > 0 && 
    files.every((_, index) => progress[index] === 100);

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-200 bg-background",
    )}>
      <Header />
      
      <main className="container mx-auto px-4 py-10 relative">
        <div 
          className="absolute top-1/4 right-0 w-60 h-60 bg-accent/5 rounded-full blur-3xl -z-10 opacity-70"
          style={{ transform: "translateX(30%)" }}
        />
        <div 
          className="absolute bottom-1/3 left-0 w-80 h-80 bg-accent/5 rounded-full blur-3xl -z-10 opacity-70"
          style={{ transform: "translateX(-30%)" }}
        />

        {!room ? (
          <div className="grid gap-10 md:grid-cols-2 max-w-5xl mx-auto">
            <Card className="elegant-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Create a Room</CardTitle>
                <CardDescription>
                  Select files to share with others
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload 
                  onFilesAdded={handleFileSelect} 
                  onFileRemove={removeFile}
                  files={files}
                />
                
                {files.length > 0 && (
                  <Button
                    className="w-full mt-6 h-11 text-sm font-medium"
                    variant="accent"
                    onClick={createRoom}
                  >
                    Create Room
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="elegant-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Join a Room</CardTitle>
                <CardDescription>
                  Enter a room code to join and download files
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="room-code">Room Code</Label>
                    <Input
                      id="room-code"
                      placeholder="Enter room code"
                      value={joinRoomInput}
                      onChange={(e) => setJoinRoomInput(e.target.value)}
                      className="focus-visible:ring-accent h-11"
                    />
                  </div>
                  <Button
                    className="w-full h-11 text-sm font-medium"
                    variant="accent"
                    onClick={joinRoom}
                  >
                    Join Room
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-8">
            <RoomInfo roomCode={room} isCreator={isCreator} />
            
            <div className="grid grid-cols-1 gap-6">
              {isCreator && (
                <Card className="elegant-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl">Transfer Controls</CardTitle>
                    <CardDescription>
                      Start sending your files to recipients
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-4">
                      <Button
                        onClick={sendFileChunks}
                        disabled={isTransferring || files.length === 0 || allFilesComplete}
                        className="flex-1 h-11"
                        variant="accent"
                      >
                        {isTransferring ? 'Transferring...' : allFilesComplete ? 'Transfer Complete' : 'Start Transfer'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={leaveRoom}
                        className="flex-1 h-11"
                      >
                        Leave Room
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Card className="elegant-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-xl">Files</CardTitle>
                    <CardDescription>
                      {files.length} file(s) {isCreator ? 'to share' : 'available'}
                    </CardDescription>
                  </div>
                  
                  {!isCreator && files.some((_, index) => progress[index] === 100) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadAll}
                      className="shrink-0 hover:bg-accent/10 hover:text-accent-foreground hover:border-accent/50"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download All
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {files.length > 0 ? (
                    <div className="space-y-4">
                      {files.map((file, index) => (
                        <FileItem
                          key={index}
                          file={file}
                          fileIndex={index}
                          progress={progress[index] || 0}
                          onDownload={downloadFile}
                          isCreator={isCreator}
                          confirmedRecipients={confirmedFiles[index] ? Array.from(confirmedFiles[index]) : []}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-muted-foreground bg-secondary/30 rounded-lg">
                      <div className="flex justify-center mb-2">
                        <File className="h-10 w-10 text-muted-foreground/40" />
                      </div>
                      <p>No files available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {!isCreator && (
                <div className="mt-6 flex justify-end">
                  <Button
                    variant="outline"
                    onClick={leaveRoom}
                  >
                    Leave Room
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <Toaster />
    </div>
  );
}

export default App;
