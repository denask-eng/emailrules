import assert from "node:assert/strict";
import test from "node:test";
import { STAGES } from "@/content/how-email-works";
import { stateOf } from "@/components/track";
import type { JourneyStop } from "./message-journey";

/* The diagram is a summary, and a summary that disagrees with the detail below
   it is worse than no summary at all. These cover the state function both the
   Track and the stop list read, so the two cannot drift apart. */

const stop = (over: Partial<JourneyStop>): JourneyStop => ({
  stage: STAGES[0],
  findings: [],
  fails: 0,
  warns: 0,
  unseeable: false,
  ...over,
});

test("a stop nobody could see is never drawn as a pass", () => {
  /* The inversion that would make the whole diagram lie. Five of the eight
     stops cannot be seen from one message, and a checker that renders them
     green is telling you consent was handled — the one thing no message can
     ever show. */
  assert.equal(stateOf(stop({ unseeable: true })), "unseen");
  assert.notEqual(stateOf(stop({ unseeable: true })), "clean");
});

test("unseeable wins even when findings landed at that stop", () => {
  /* Belt and braces: if a stop is flagged unseeable it stays unseeable, so a
     stray finding can never quietly promote it to a real verdict. */
  assert.equal(stateOf(stop({ unseeable: true, fails: 3, warns: 2 })), "unseen");
});

test("a failure outranks a warning at the same stop", () => {
  assert.equal(stateOf(stop({ fails: 1, warns: 9 })), "broke");
  assert.equal(stateOf(stop({ fails: 0, warns: 1 })), "warn");
});

test("a seen stop with nothing wrong is clean", () => {
  assert.equal(stateOf(stop({})), "clean");
});

test("there are eight stages and the diagram draws all of them", () => {
  /* A quiet journey is still a whole trip. Dropping empty stops would make a
     journey missing its first stop read as one where the first stop went
     fine — and the first stop is consent. */
  assert.equal(STAGES.length, 8);
  assert.deepEqual(
    STAGES.map((s) => s.n),
    [1, 2, 3, 4, 5, 6, 7, 8],
  );
});
