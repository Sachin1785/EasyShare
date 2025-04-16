import React, { useState } from "react";
import { Copy, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";

const RoomInfo = ({ roomCode, isCreator }) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "Room code copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 bg-muted/30 rounded-lg border hover-accent">
      <h2 className="text-xl font-semibold">
        {isCreator ? "Your Room is Ready!" : "Connected to Room"}
      </h2>
      
      <div className="flex items-center justify-center gap-3">
        <div className="bg-card px-4 py-2 rounded-md border shadow-sm font-mono text-xl">
          {roomCode}
        </div>
        <Button
          variant={copied ? "accent" : "outline"}
          size="icon"
          onClick={copyToClipboard}
          className={cn(
            "transition-all duration-200",
            copied ? "border-accent text-accent-foreground" : "hover:border-accent/50 hover:bg-accent/10"
          )}
        >
          {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      
      <p className="text-sm text-muted-foreground">
        {isCreator 
          ? "Share this code with others to let them join your room and download your files."
          : "You've connected to this room. You can now download files shared by the room creator."}
      </p>
    </div>
  );
};

export default RoomInfo; 