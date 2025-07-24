"use client";

import { Grid2X2, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ViewToggleProps {
  viewMode: 'grid' | 'list';
  onChange: (mode: 'grid' | 'list') => void;
}

export function ViewToggle({ viewMode, onChange }: ViewToggleProps) {
  return (
    <div className="flex border rounded-md overflow-hidden">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={viewMode === 'grid' ? "default" : "ghost"}
              size="icon"
              className="rounded-none border-0"
              onClick={() => onChange('grid')}
            >
              <Grid2X2 className="h-4 w-4" />
              <span className="sr-only">网格视图</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>网格视图</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={viewMode === 'list' ? "default" : "ghost"}
              size="icon"
              className="rounded-none border-0"
              onClick={() => onChange('list')}
            >
              <List className="h-4 w-4" />
              <span className="sr-only">列表视图</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>列表视图</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
} 