import React from "react";
import { File, Download, CheckCircle, Clock, UserCheck } from "lucide-react";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { cn } from "../lib/utils";

const FileItem = ({ file, fileIndex, progress, onDownload, isCreator, className, confirmedRecipients = [] }) => {
  const fileSize = (file.size / (1024 * 1024)).toFixed(2);
  const formattedProgress = Math.round(progress || 0);
  const recipientCount = confirmedRecipients?.length || 0;
  
  const getStatusIcon = () => {
    if (isCreator && formattedProgress === 100) {
      if (recipientCount > 0) {
        return <UserCheck className="h-4 w-4 text-green-500" />;
      } else {
        return <Clock className="h-4 w-4 text-amber-500" />;
      }
    } else if (formattedProgress === 100) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (formattedProgress > 0) {
      return <Clock className="h-4 w-4 text-amber-500" />;
    } else {
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // File extension extraction
  const fileExt = file.name.split('.').pop().toLowerCase();
  
  // Different colors based on file type
  const getFileColor = () => {
    switch(fileExt) {
      case 'pdf': return 'text-red-500';
      case 'doc':
      case 'docx': return 'text-blue-500';
      case 'xls':
      case 'xlsx': return 'text-green-500';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return 'text-purple-500';
      case 'zip':
      case 'rar': return 'text-amber-500';
      default: return 'text-primary';
    }
  };

  // Get status text based on progress and confirmation
  const getStatusText = () => {
    if (isCreator && formattedProgress === 100) {
      if (recipientCount > 0) {
        return `Received by ${recipientCount} recipient${recipientCount > 1 ? 's' : ''}`;
      } else {
        return "Sent, awaiting download";
      }
    } else if (formattedProgress === 100) {
      return "Complete";
    } else if (formattedProgress > 0) {
      return `${formattedProgress}%`;
    } else {
      return "Waiting";
    }
  };

  return (
    <div className={cn(
      "p-4 rounded-lg border bg-card shadow-sm transition-all duration-200 hover-accent",
      formattedProgress === 100 && (isCreator ? recipientCount > 0 : true) ? "border-green-500/30" : 
        formattedProgress === 100 ? "border-amber-500/30" : "border-border",
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="h-10 w-10 flex items-center justify-center rounded bg-secondary">
            <File className={cn("h-5 w-5", getFileColor())} />
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate" title={file.name}>{file.name}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{fileSize} MB</span>
              <span>•</span>
              <span className="flex items-center gap-1" title={
                isCreator 
                ? formattedProgress === 100 
                  ? recipientCount > 0 
                    ? "File has been successfully received by recipient(s)" 
                    : "File sent, waiting for recipient to download" 
                  : "Uploading file to recipients"
                : formattedProgress === 100 
                  ? "File is ready to download" 
                  : "Receiving file from sender"
              }>
                {getStatusIcon()}
                {getStatusText()}
              </span>
            </div>
          </div>
        </div>
        
        {formattedProgress === 100 && !isCreator && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onDownload(fileIndex)}
            className="shrink-0 hover:bg-accent/10 hover:text-accent-foreground hover:border-accent/50"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        )}
      </div>
      
      <Progress 
        value={formattedProgress} 
        variant={
          formattedProgress === 100 && (isCreator ? recipientCount > 0 : true) 
            ? "green" 
            : formattedProgress === 100 ? "amber" : "blue"
        }
        className={cn(
          "h-2", 
          formattedProgress === 100 && (isCreator ? recipientCount > 0 : true)
            ? "bg-green-100 dark:bg-green-950/30" 
            : formattedProgress === 100 
              ? "bg-amber-100 dark:bg-amber-950/30" 
              : "bg-secondary"
        )}
        showValue={formattedProgress > 0 && formattedProgress < 100}
      />
    </div>
  );
};

export default FileItem; 