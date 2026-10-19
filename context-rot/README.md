# More Context ≠ Better Answers

`index.html` is the complete application: inline CSS, semantic HTML, and a vanilla JavaScript module. No build, backend, API key, or installed dependency is required. The optional WebLLM adapter imports a pinned library from a CDN only when enabled. This README is usage documentation, not an application dependency.

## Run locally

From the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open http://localhost:8765/context-rot/ in Chrome. If that port is already serving this repository, just open the URL. You can also open `index.html` directly for the UI/simulation, but localhost is recommended for model APIs and CDN loading. Stop the server with Ctrl+C.

## Code map

Search these names in the inline script:

- `noiseNote`, `presetNoise`, `buildContext`: deterministic office notes, similar project records, and placement of relevant records.
- `makeTask`: linked-record and release-audit presets with answer keys derived from their source data.
- `ChromeAIEngine`: feature detection, initialization/download progress, empty-session cloning, context-window checks, actual Prompt API calls, and cleanup.
- `WebLLMEngine`: optional CDN import, model download, fresh chat state, and real completions.
- `SimulationEngine`: literal echo of the supplied fact; no manufactured mistakes or model accuracy claims.
- `evaluate`: substring checking for the original baseline; exact JSON field comparisons for presets, with separate format and unsupported-approval labels.
- `runTrial`, `runExperiment`: timing, error handling, batches, results, and debug output.

## Chrome / Gemini Nano

The page checks `globalThis.LanguageModel` and calls `LanguageModel.availability()` with English text options. It shows Chrome's availability state if supported. Click **Initialize Chrome AI** to create the session; initial use may download the model. An available API is not the same as an initialized session.

To check independently in Chrome DevTools on localhost:

```js
if ('LanguageModel' in globalThis) {
  console.log(await LanguageModel.availability({
    expectedInputs: [{ type: 'text', languages: ['en'] }],
    expectedOutputs: [{ type: 'text', languages: ['en'] }]
  }));
} else {
  console.log('Prompt API is not exposed in this browser/context.');
}
```

Expected availability states include `available`, `downloadable`, `downloading`, and `unavailable`. Chrome's UI at `chrome://on-device-internals` helps inspect the installed model. Hardware, browser version, policy, and supported language affect availability. See the [official Prompt API guide](https://developer.chrome.com/docs/ai/prompt-api) for current requirements. The ordinary web API does not expose numeric temperature by default, so this demo leaves Chrome's sampling at its defaults.

## Optional WebLLM fallback

Open **Advanced settings & local model setup**, then click **Enable WebLLM fallback & download model**. Chrome is checked first and remains preferred when available. Otherwise the page imports `@mlc-ai/web-llm@0.2.85` from `esm.run`, downloads `SmolLM2-360M-Instruct-q4f16_1-MLC`, and runs inference using WebGPU. Internet access is required for library/model downloads. This model requires GPU support including shader-f16. The temperature control applies to this engine only.

Failed initialization remains visible; it never silently fabricates a model answer. Once a model is initialized, reload to release it or re-detect availability. The optional WebLLM model has a limited context window, so larger trials may produce unscored capacity errors. These are not evidence of retrieval degradation. See [WebLLM documentation](https://webllm.mlc.ai/docs/user/get_started.html).

## Three tasks

The release audit is selected by default. The original editable single-fact task remains in the task picker.

1. **Find one fact:** the original editable date lookup. Scoring checks only fragment presence, with its limitations explicitly labelled.
2. **Follow a chain:** connect project → package → responsible team → owner. Similar records refer to other projects with disjoint IDs. Return a two-field JSON object.
3. **Release audit:** audit four projects. Connect each to a package, lane date, and team owner. SHIP only when QA passes and blockers are zero; otherwise the date and decision must both be HOLD. Approval codes are absent and must be UNKNOWN. Return four JSON objects (20 scored fields). Project names may optionally include the prefix “Project”; that cosmetic difference is not a reasoning error.

Preset case numbers 1–20 change deterministic mappings, owners, dates, and statuses. They are not randomly regenerated between trials. Run several cases rather than drawing conclusions from one.

## Comparable inputs and honest results

Multipliers describe **noise quantity**, not exact total prompt lengths. Each 1× adds four distracting notes/records. The original baseline uses 1×/5×/10×/20×/50×; presets use 0×/1×/3×/5×/10× (0× is a clean baseline without distracting records) to keep the sweep useful on a small local model. Capacity checks still apply on every device. Longer inputs retain the shorter input's noise prefix. Preset noise is more detailed than baseline office notes, so compare lengths **within the same task**, using actual counts.

Beginning/middle/end keep relevant records together. **Spread out** distributes those same records through the noise, keeping their order. Moving records preserves the full set of records, their content, noise order, question, and total character count. No instructions are weakened as length increases. No timestamps or previous responses enter a prompt.

The preview marks relevant records in yellow only in the UI. The answer key is generated independently with normal JavaScript and is never sent to the model. Cases include explicit reporting rules for missing approval codes. A made-up approval value is flagged as an unsupported claim; a wrong mapped date/owner is a field mismatch, not automatically labelled a hallucination. Non-JSON output is a format failure. Common abstentions such as “not provided” fail the exact UNKNOWN formatting requirement but do not count as invented codes. This is a narrow, transparent check, not a universal hallucination detector.

Batches snapshot all settings and disable editing. Every Chrome trial clones an empty session; WebLLM resets its chat. Chrome cards show measured input tokens/window when the API exposes them. Approximate counts remain labelled. A 1,024-token reserve is used for output; oversized prompts are not shortened and are unscored. WebLLM has a 1,024-token output limit; incomplete responses are unscored.

The comparison summary distinguishes a short baseline failure from a short-pass/long-fail observation. A baseline failure cannot isolate a problem caused by increased length. All-correct results are valid. Different answers across repetitions demonstrate variation, not necessarily hallucination or context degradation.

For the custom baseline, update **Expected answer fragment** after editing the fact. It must appear in that fact. The generator rejects literal overlaps with office notes, but cannot check semantic uniqueness for arbitrary custom questions. Substring evaluation can miss paraphrases or accept negations; inspect the response.

Latency includes per-trial session preparation, excluding the initial model download. Simulation does not execute preset tasks and never reports model accuracy. Debug shows the last trial's response, answer key, field-level evaluation, and token usage. Results retain their run settings if controls are later edited.

## Suggested experiments

1. Initialize Chrome AI. Select **Release audit**, **case 1**, **Spread out**. Click **Compare Context Sizes**. Compare field scores and open **Field mismatches** when present. Capacity errors are not evidence of hallucination.
2. Keep the same task/case, select an in-window context size, then **Test Fact Position**. This compares beginning, middle, end, and spread placements without changing the records.
3. Use **Run 5 Times** to check variability, then try case numbers 2–5. Keep sampling unchanged. Record all outcomes; do not select only failing runs.

## Regression checks

```sh
node context-rot/test.mjs
```

The dependency-free checks cover 1,200 task/case/length/position combinations, deterministic inputs, unique relevant records, placement invariants, independently traversed answer keys, format failures, and unsupported-code classification. These checks validate the demo; they do not simulate model performance.
