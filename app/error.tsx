'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1b3b] to-[#2a2b5b] flex items-center justify-center p-4">
      <Card className="bg-white/10 backdrop-blur-lg border-none text-white max-w-md w-full">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold mb-4">Something went wrong!</h2>
          <p className="text-red-400 text-center mb-4">
            {error.message || 'An unexpected error occurred'}
          </p>
          <Button
            onClick={reset}
            className="w-full bg-[#28a745] hover:bg-[#28a745]/90"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}