// AI client — proxies to the Go AIService. Each call may pin a specific
// provider+model via `override`; otherwise the registry's current
// default (driven by Settings) is used.

import { WailsHandler as AIService } from "../../bindings/github.com/O6lvl4/memre/internal/ai";

export interface AIOverride {
  provider?: string;
  model?: string;
}

export interface GenerateCardsRequest {
  content: string;
  deckId: string;
  deckName?: string;
  cardCount?: number;
  override?: AIOverride;
  // legacy shape — kept so existing dialog code compiles
  provider?: string;
  model?: string;
}

export interface GeneratedCard {
  question: string;
  answer: string;
}

export interface GenerateCardsResponse {
  cards: GeneratedCard[];
  provider: string;
  model: string;
}

export interface GenerateComprehensiveRequest {
  content: string;
  deckId: string;
  deckName?: string;
  minCards?: number;
  cardsPerChunk?: number;
  override?: AIOverride;
  provider?: string;
  model?: string;
}

export interface GenerateComprehensiveResponse {
  cards: GeneratedCard[];
  provider: string;
  model: string;
  stats: { chunks: number; totalExtracted: number };
}

export interface ProviderInfo {
  id: string;
  name: string;
  available: boolean;
  configured: boolean;
  defaultModel: string;
  supportedModels: string[];
  note: string;
}

export interface ModelsResponse {
  providers: {
    google: { id: string; name: string; description: string }[] | null;
    groq: { id: string; name: string; speed: string }[] | null;
    cloudflare: { id: string; name: string }[] | null;
  };
  defaultProvider: "google" | "cloudflare" | "groq" | null;
}

export interface GenerateQuestionRequest {
  question: string;
  answer: string;
  knowledgeContext?: string;
  override?: AIOverride;
  provider?: string;
}

export interface GenerateQuestionResponse {
  followUpQuestion: string;
  provider: string;
  model: string;
}

export interface EvaluateAnswerRequest {
  originalQuestion: string;
  originalAnswer: string;
  followUpQuestion: string;
  userAnswer: string;
  override?: AIOverride;
  provider?: string;
}

export interface EvaluateAnswerResponse {
  score: "good" | "partial" | "incorrect";
  feedback: string;
  suggestion?: string;
  provider: string;
  model: string;
}

export interface ExplainRequest {
  cardQuestion: string;
  cardAnswer: string;
  userQuestion: string;
  knowledgeContext?: string;
  override?: AIOverride;
  provider?: string;
}

export interface ExplainResponse {
  explanation: string;
  provider: string;
  model: string;
}

export interface AIStatus {
  connected: boolean;
  baseUrl: string;
  model: string;
  modelInstalled: boolean;
  availableTags: string[];
  error: string;
}

function ovr(o?: AIOverride): [string, string] {
  return [o?.provider ?? "", o?.model ?? ""];
}

export async function getAIStatus(): Promise<AIStatus> {
  const s = (await AIService.Status()) as any;
  return {
    connected: !!s.connected,
    baseUrl: s.baseUrl,
    model: s.model,
    modelInstalled: !!s.modelInstalled,
    availableTags: s.availableTags ?? [],
    error: s.error ?? "",
  };
}

export async function listProviders(): Promise<ProviderInfo[]> {
  const list = (await AIService.ListProviders()) as any[];
  return (list ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    available: !!p.available,
    configured: !!p.configured,
    defaultModel: p.defaultModel,
    supportedModels: p.supportedModels ?? [],
    note: p.note ?? "",
  }));
}

function providerLabel(connected: boolean, model: string): { provider: string; model: string } {
  return connected ? { provider: "ai", model } : { provider: "local-stub", model: "stub" };
}

export async function generateCards(req: GenerateCardsRequest): Promise<GenerateCardsResponse> {
  const status = await getAIStatus();
  const [p, m] = ovr(req.override);
  const res = (await AIService.GenerateCards(req.content, req.cardCount ?? 5, p, m)) as any;
  return {
    cards: (res.cards ?? []).map((c: any) => ({ question: c.question, answer: c.answer })),
    ...providerLabel(status.connected, m || status.model),
  };
}

export async function generateCardsComprehensive(
  req: GenerateComprehensiveRequest
): Promise<GenerateComprehensiveResponse> {
  const status = await getAIStatus();
  const [p, m] = ovr(req.override);
  const target = req.minCards ?? 10;
  const res = (await AIService.GenerateCards(req.content, target, p, m)) as any;
  const cards = (res.cards ?? []).map((c: any) => ({ question: c.question, answer: c.answer }));
  return {
    cards,
    ...providerLabel(status.connected, m || status.model),
    stats: { chunks: 1, totalExtracted: cards.length },
  };
}

export async function getModels(): Promise<ModelsResponse> {
  const status = await getAIStatus();
  return {
    providers: {
      google: null,
      groq: null,
      cloudflare: [
        {
          id: status.connected ? status.model : "local-stub",
          name: status.connected ? `${status.model}` : "Local stub",
        },
      ],
    },
    defaultProvider: "cloudflare",
  };
}

export async function generateFollowUpQuestion(
  req: GenerateQuestionRequest
): Promise<GenerateQuestionResponse> {
  const status = await getAIStatus();
  const [p, m] = ovr(req.override);
  const res = (await AIService.GenerateFollowUp(req.question, req.answer, req.knowledgeContext ?? "", p, m)) as any;
  return {
    followUpQuestion: res.followUpQuestion ?? `${req.question} を別の言い方で説明してください`,
    ...providerLabel(status.connected, m || status.model),
  };
}

export async function evaluateAnswer(req: EvaluateAnswerRequest): Promise<EvaluateAnswerResponse> {
  const status = await getAIStatus();
  const [p, m] = ovr(req.override);
  const res = (await AIService.EvaluateAnswer(
    req.originalQuestion,
    req.originalAnswer,
    req.followUpQuestion,
    req.userAnswer,
    p, m,
  )) as any;
  return {
    score: (res.score as "good" | "partial" | "incorrect") ?? "partial",
    feedback: res.feedback ?? "",
    suggestion: res.suggestion || undefined,
    ...providerLabel(status.connected, m || status.model),
  };
}

export async function explainCard(req: ExplainRequest): Promise<ExplainResponse> {
  const status = await getAIStatus();
  const [p, m] = ovr(req.override);
  const res = (await AIService.ExplainCard(
    req.cardQuestion,
    req.cardAnswer,
    req.userQuestion,
    req.knowledgeContext ?? "",
    p, m,
  )) as any;
  return {
    explanation: res.explanation ?? "",
    ...providerLabel(status.connected, m || status.model),
  };
}
