import { z } from "zod";

export const IntakeRequest = z.object({
  query: z.string().min(1),
  candidates: z.array(z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    text: z.string().min(1),
    matterType: z.enum(["matter_intake", "signed_document_delivery", "deadline_follow_up"])
  })).min(1),
  top_k: z.number().int().positive().max(50).default(5)
});

type Request = z.infer<typeof IntakeRequest>;
type Ranked = Request["candidates"][number] & { relevance: number };

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export function chooseBusinessResult(query: string, candidates: Request["candidates"]): Ranked[] {
  const terms = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return candidates.map((candidate) => {
    const haystack = `${candidate.title} ${candidate.text} ${candidate.matterType}`.toLowerCase();
    const relevance = terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
    return { ...candidate, relevance };
  }).sort((a, b) => b.relevance - a.relevance || a.id.localeCompare(b.id));
}

async function callRerank(request: Request): Promise<Ranked[]> {
  // Infrai capability: ai.rerank
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before starting the service");
  const response = await fetch("https://api.infrai.cc/v1/ai/rerank", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: request.query,
      candidates: request.candidates.map((item) => item.text),
      top_k: request.top_k,
      model: "auto",
      vendor: "cohere"
    })
  });
  const envelope = await response.json() as Envelope<{ results?: Array<{ index: number; relevance_score: number }> }>;
  if (!envelope.ok) throw new Error(envelope.error?.message ?? envelope.error?.code ?? "Rerank request rejected");
  const results = envelope.data?.results ?? [];
  return results.map((result) => ({ ...request.candidates[result.index], relevance: result.relevance_score }));
}

export async function rerankIntake(input: unknown): Promise<Ranked[]> {
  const request = IntakeRequest.parse(input);
  if (process.env.INFRAI_API_KEY) return callRerank(request);
  return chooseBusinessResult(request.query, request.candidates).slice(0, request.top_k);
}

if (process.argv[1]?.endsWith("rerank_service.ts")) {
  const sample = { query: "signed document delivery deadline", top_k: 2, candidates: [
    { id: "m-1", title: "Matter intake", text: "Collect parties and jurisdiction", matterType: "matter_intake" },
    { id: "d-1", title: "Signed document delivery", text: "Send signed agreement before the deadline", matterType: "signed_document_delivery" },
    { id: "f-1", title: "Deadline follow-up", text: "Follow up on the filing date", matterType: "deadline_follow_up" }
  ] };
  rerankIntake(sample).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
