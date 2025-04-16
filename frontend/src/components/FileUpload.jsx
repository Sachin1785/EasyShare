import React, { useState, useRef } from "react";
import { Upload, File, X } from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";

const FileUpload = ({ onFilesAdded, onFileRemove, files }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const handleFilesAdded = (newFiles) => {
    onFilesAdded(newFiles);
    toast({
      title: "Files added",
      description: `${newFiles.length} file(s) added`,
    });
  };

  const handleFileSelect = (e) => {
    if (e.target.files?.length) {
      handleFilesAdded(Array.from(e.target.files));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files?.length) {
      handleFilesAdded(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          "hover:border-primary hover:bg-primary/5",
          isDragging ? "border-primary bg-primary/5" : "border-muted"
        )}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          id="file-input"
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload className="w-10 h-10 mx-auto mb-4 text-primary" />
        <p className="text-lg font-medium">{files.length > 0 ? "Add more files" : "Drop files here or click to upload"}</p>
        <p className="text-sm text-muted-foreground mt-1">Supports multiple files</p>
      </div>

      {files.length > 0 && (
        <div className="space-y-3 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Selected Files ({files.length})</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onFilesAdded([]);
                toast({
                  title: "Files cleared",
                  description: "All files have been removed",
                });
              }}
              className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
            >
              Clear All
            </Button>
          </div>
          
          <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <File className="h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate" title={file.name}>{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onFileRemove(index)}
                  className="text-destructive shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload; 