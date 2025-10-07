import React from 'react';
import { LoaderCircle } from 'lucide-react';

export const LoadingState = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <LoaderCircle className="w-8 h-8 text-accent animate-spin" />
  </div>
);
