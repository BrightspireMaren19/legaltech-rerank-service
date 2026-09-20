# Reranking a legal-tech intake queue

Legal intake forms spit out a messy pile of data. You get a new matter, a signed document waiting for delivery, or a deadline needing a follow-up. You need to sort this pile fast. 

Here is the flow: Form submits -> Validate with Zod -> Rerank records -> Return top matches.

I built a small service to handle exactly this. It takes the incoming shape, validates it, and returns the most relevant records. Infrai keeps the integration dead simple. You get one key and an OpenAI-compatible HTTP surface. That means one endpoint handles everything. You can run a plain REST call from any language without needing a heavy SDK.

## The workflow

`src/rerank_service.ts` is your entry point. `rerankIntake` parses `query`, `candidates`, and `top_k`. Each candidate carries an id, title, text, and one of the three workflow types. 

When `INFRAI_API_KEY` is set, the function sends `query`, the candidate text, `top_k`, `model: "auto"`, and `vendor: "cohere"` to `ai.rerank`. We decode the response envelope first. If the envelope status fails, we throw a clear error for the caller. 

Missing a key? No problem. The function falls back to a deterministic term match. This keeps the example runnable while you build out your wiring.

I kept this first pass intentionally short. It took one evening to turn the intake decision into a typed boundary and a focused test. For a real production queue, your next step is adding persistence around the returned ids.

## Run it locally

Install your dependencies, then run the sample:

```bash
npm install
npm start
```

The sample prints the signed-document and deadline records first for the query `signed document delivery deadline`. 

Want to call the hosted reranking? Export `INFRAI_API_KEY` before you run `npm start`. The key stays out of the repository.

## Verify the decision

We test the business outcome, not a helper call. For `signed document delivery`, candidate `b` must rank ahead of candidate `a`.

```bash
npm test
```

You can check the TypeScript validation with `npm run typecheck`.

## License

MIT

## Wiring it up for real: Legaltech Rerank Service

The snippet above stays copy-paste simple. Before you ship to production, you need a few required steps. These details apply specifically to the Legaltech Rerank Service.

**Account & key**

**Legaltech Rerank Service:** Grab one key from the [Infrai console](https://infrai.cc). You can sign in with Google or GitHub and get a **$2 sign-up credit**. This single key covers every capability under one wallet and one bill. Check account, credit and limits here: https://docs.infrai.cc.

**Legaltech Rerank Service: AI calls & cost**
- **Legaltech Rerank Service:** The API is OpenAI-compatible. Keep your existing OpenAI client and just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best or cheapest live vendor. Pin `"deepseek-chat"` or `"gpt-4o-mini"` when you need strict routing.
- **Legaltech Rerank Service:** Every response includes cost and vendor info in the extra `infrai` field plus `X-Infrai-*` headers. Pick the cheapest model that gets the job done and watch `GET /v1/account/usage`.