import { prisma } from "@/lib/prisma";
import type { AIConfidence, AutonomyMode } from "@prisma/client";

interface SourceRef {
  type: "profile" | "meeting" | "document" | "task" | "milestone";
  id: string;
  label: string;
}

interface CreateAIOutputParams {
  counselorId: string;
  studentId: string;
  feature: string;
  sourceBasis: SourceRef[];
  confidence: AIConfidence;
  autonomyMode?: AutonomyMode;
  input?: unknown;
  output: unknown;
  modelId: string;
  tokenUsage?: { inputTokens: number; outputTokens: number };
}

export async function createAIOutput(params: CreateAIOutputParams) {
  return prisma.aIOutput.create({
    data: {
      counselorId: params.counselorId,
      studentId: params.studentId,
      feature: params.feature,
      sourceBasis: JSON.parse(JSON.stringify(params.sourceBasis)),
      confidence: params.confidence,
      autonomyMode: params.autonomyMode || "DRAFT",
      input: params.input ? JSON.parse(JSON.stringify(params.input)) : undefined,
      output: JSON.parse(JSON.stringify(params.output)),
      modelId: params.modelId,
      tokenUsage: params.tokenUsage ? JSON.parse(JSON.stringify(params.tokenUsage)) : undefined,
    },
  });
}
