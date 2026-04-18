"use client";

import { Sparkles, Calendar, MessageSquare, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QuickActions({ studentId }: { studentId: string }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button className="bg-gradient-to-r from-[oklch(0.65_0.2_265)] to-[oklch(0.55_0.22_290)] text-white border-0 shadow-lg shadow-[oklch(0.65_0.2_265_/_20%)] hover:shadow-[oklch(0.65_0.2_265_/_30%)] hover:brightness-110 transition-all">
        <Sparkles className="mr-2 h-4 w-4" />
        Generate Prep Brief
      </Button>
      <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
        <Calendar className="mr-2 h-4 w-4" />
        Schedule Meeting
      </Button>
      <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
        <MessageSquare className="mr-2 h-4 w-4" />
        Draft Update
      </Button>
      <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
        <FileText className="mr-2 h-4 w-4" />
        Quick Note
      </Button>
    </div>
  );
}
