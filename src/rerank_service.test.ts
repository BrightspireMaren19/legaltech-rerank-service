import assert from "node:assert/strict";
import { chooseBusinessResult, IntakeRequest } from "./rerank_service";

const input = IntakeRequest.parse({ query: "signed document delivery", candidates: [
  { id: "a", title: "Matter intake", text: "Collect parties", matterType: "matter_intake" },
  { id: "b", title: "Signed document delivery", text: "Send the signed agreement", matterType: "signed_document_delivery" }
] });
const ranked = chooseBusinessResult(input.query, input.candidates);
assert.equal(ranked[0].id, "b");
assert.equal(ranked[1].id, "a");
console.log("business decision test passed");
