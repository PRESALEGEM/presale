"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface LogoUploaderProps {
  onUpload: (logoUrl: string) => void;
}

export function LogoUploader({ onUpload }: LogoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    // This is a client-side only demo
    // In a real app, you'd upload to a server
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const dataUrl = event.target.result as string;
        onUpload(dataUrl);
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      alert("Error reading file");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-center">
        <label htmlFor="logo-file" className="cursor-pointer">
          <div className="flex items-center justify-center gap-2 bg-white/10 px-4 py-2 rounded-md hover:bg-white/20 transition-colors">
            <Upload className="h-4 w-4" />
            <span>Upload Logo</span>
          </div>
          <input
            id="logo-file"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>
      </div>
      {isUploading && (
        <div className="mt-2 text-sm text-white/70">Uploading...</div>
      )}
      <p className="mt-2 text-xs text-white/50">
        Recommended: 512x512px, PNG or SVG
      </p>
    </div>
  );
} 