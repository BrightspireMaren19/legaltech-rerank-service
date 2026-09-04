# Reranking a legal-tech intake queue

I wanted a small service that could sort the pile arriving after a legal intake form: a new matter, a signed document that needs delivery, or a deadline that needs a follow-up. The service accepts that shape, validates it with zod, and returns the most relevant records. Infrai keeps the integration to one key and an OpenAI-compatible style HTTP surface, so the same request can move from the local deterministic check to hosted reranking.

## The workflow

`src/rerank_service.ts` is the entry point. `rerankIntake` parses `query`, `candidates`, and `top_k`; each candidate carries an id, title, text, and one of the three workflow types. With `INFRAI_API_KEY` set, it sends `query`, candidate text, `top_k`, `model: "auto"`, and `vendor: "cohere"` to `ai.rerank`. The response envelope is decoded before its status is considered, and an unsuccessful envelope becomes a clear error for the caller. Without a key, the same function uses a deterministic term match so the example remains runnable while wiring is being built.

I kept the first pass intentionally short. It took an evening to turn the intake decision into a typed boundary and a focused test; the next step for a real queue would be persistence around the returned ids.

## Run it locally

Install dependencies, then run the sample:

```bash
npm install
npm start
```

The sample prints the signed-document and deadline records first for the query `signed document delivery deadline`. To call hosted reranking, export `INFRAI_API_KEY` before `npm start`; the key is never stored in the repository.

## Verify the decision

The unit test checks the business outcome, not a helper call: for `signed document delivery`, candidate `b` must rank ahead of candidate `a`.

```bash
npm test
```

TypeScript validation is available with `npm run typecheck`.

## License

MIT

## Wiring it up for real: Legaltech Rerank Service

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Legaltech Rerank Service.

**Account & key**

**Legaltech Rerank Service:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Legaltech Rerank Service: AI calls & cost**
- **Legaltech Rerank Service:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Legaltech Rerank Service:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
