/**
 * LLM Client — Dual-backend LLM integration for report generation.
 * Supports:
 *   1. Ollama REST API  (desktop: localhost:11434)
 *   2. WebLLM / MLC     (mobile: in-browser model via WebGPU)
 */

const LLMClient = (() => {
  // ─── Shared config ──────────────────────────────────────────────────────────
  let llmBackend = "ollama";  // "ollama" | "webllm"

  // Ollama settings
  let ollamaEndpoint = "http://localhost:11434/api/generate";
  let ollamaModel = "qwen2.5:3b";

  // WebLLM settings
  let webllmModel = "Qwen3-1.7B-q4f16_1-MLC";
  let webllmEngine = null;
  let webllmLoading = false;
  let webllmLoadProgress = 0;

  // Available WebLLM models (small, mobile-friendly, verified working)
  const WEBLLM_MODELS = [
    { id: "Qwen3-1.7B-q4f16_1-MLC",                  name: "Qwen3 1.7B (推荐)",    size: "~1.0 GB" },
    { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",       name: "Qwen2.5 1.5B",         size: "~1.0 GB" },
    { id: "Qwen3-0.6B-q4f16_1-MLC",                  name: "Qwen3 0.6B (最小)",    size: "~0.4 GB" },
    { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",        name: "Llama 3.2 1B",         size: "~0.7 GB" },
    { id: "SmolLM2-1.7B-Instruct-q4f16_1-MLC",       name: "SmolLM2 1.7B",         size: "~1.0 GB" },
    { id: "Qwen2.5-3B-Instruct-q4f16_1-MLC",         name: "Qwen2.5 3B",           size: "~2.0 GB" }
  ];

  // ─── Ollama Backend ─────────────────────────────────────────────────────────

  async function generateWithOllama(prompt, options = {}) {
    const endpoint = options.endpoint || ollamaEndpoint;
    const model = options.model || ollamaModel;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model, prompt,
        stream: false,
        options: { temperature: 0.7, num_predict: 1024, top_p: 0.9 }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.response || "";
  }

  async function generateWithOllamaStream(prompt, options = {}) {
    const endpoint = options.endpoint || ollamaEndpoint;
    const model = options.model || ollamaModel;
    const onToken = options.onToken || (() => {});

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model, prompt,
        stream: true,
        options: { temperature: 0.7, num_predict: 1024, top_p: 0.9 }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "", buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          if (data.response) { fullText += data.response; onToken(data.response); }
          if (data.done) break;
        } catch (e) { /* skip */ }
      }
    }
    return fullText;
  }

  async function checkOllama(model = ollamaModel) {
    try {
      const resp = await fetch("http://localhost:11434/api/tags", {
        method: "GET",
        signal: AbortSignal.timeout(3000)
      });
      if (!resp.ok) return { available: false, models: [], error: "Ollama server returned error" };
      const data = await resp.json();
      const models = (data.models || []).map(m => m.name);
      const hasModel = models.some(m => m.startsWith(model));
      return { available: true, models, hasRequestedModel: hasModel };
    } catch (e) {
      return { available: false, models: [], error: `Ollama 不可达: ${e.message}` };
    }
  }

  // ─── WebLLM Backend ─────────────────────────────────────────────────────────

  async function checkWebGPU() {
    if (!navigator.gpu) {
      return { available: false, error: "浏览器不支持 WebGPU" };
    }
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return { available: false, error: "无法获取 GPU 适配器" };
      return { available: true, adapterInfo: adapter.info || {} };
    } catch (e) {
      return { available: false, error: `WebGPU 错误: ${e.message}` };
    }
  }

  /**
   * Load (or return cached) WebLLM engine.
   * @param {function} onProgress - ({ progress: 0-1, text: string }) => void
   */
  async function loadWebLLMEngine(onProgress) {
    if (webllmEngine) return webllmEngine;
    if (webllmLoading) {
      // Wait for existing load to finish
      while (webllmLoading) {
        await new Promise(r => setTimeout(r, 200));
      }
      return webllmEngine;
    }

    webllmLoading = true;
    webllmLoadProgress = 0;

    try {
      const { CreateMLCEngine } = await import(
        "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.70/+esm"
      );

      webllmEngine = await CreateMLCEngine(webllmModel, {
        initProgressCallback: (report) => {
          webllmLoadProgress = report.progress;
          if (onProgress) onProgress(report);
        }
      });

      webllmLoading = false;
      return webllmEngine;
    } catch (err) {
      webllmLoading = false;
      webllmEngine = null;
      throw err;
    }
  }

  /**
   * Generate via WebLLM (in-browser model).
   * First call will download the model (~1-2 GB), cached on subsequent calls.
   */
  async function generateWithWebLLM(prompt, options = {}) {
    const modelId = options.model || webllmModel;
    const onProgress = options.onProgress || (() => {});

    // Re-initialize if model changed
    if (modelId !== webllmModel) {
      if (webllmEngine) { webllmEngine = null; }
      webllmModel = modelId;
    }

    const engine = await loadWebLLMEngine(onProgress);

    // OpenAI-compatible chat API
    const reply = await engine.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1024
    });

    return reply.choices[0].message.content;
  }

  /**
   * Generate via WebLLM with streaming (simulated via chunk callback).
   */
  async function generateWithWebLLMStream(prompt, options = {}) {
    const modelId = options.model || webllmModel;
    const onToken = options.onToken || (() => {});
    const onProgress = options.onProgress || (() => {});

    if (modelId !== webllmModel) {
      if (webllmEngine) { webllmEngine = null; }
      webllmModel = modelId;
    }

    const engine = await loadWebLLMEngine(onProgress);

    const reply = await engine.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1024,
      stream: true
    });

    let fullText = "";
    for await (const chunk of reply) {
      const content = chunk.choices?.[0]?.delta?.content || "";
      if (content) {
        fullText += content;
        onToken(content);
      }
    }
    return fullText;
  }

  async function unloadWebLLM() {
    if (webllmEngine) {
      try { webllmEngine.unload(); } catch (e) { /* ignore */ }
      webllmEngine = null;
    }
    webllmLoading = false;
    webllmLoadProgress = 0;
  }

  function getWebLLMLoadProgress() {
    return { loading: webllmLoading, progress: webllmLoadProgress };
  }

  // ─── Unified API ────────────────────────────────────────────────────────────

  /**
   * Smart generate: tries WebLLM if backend is "webllm", else Ollama.
   */
  async function generate(prompt, options = {}) {
    if (options.backend === "webllm" || (llmBackend === "webllm" && options.backend !== "ollama")) {
      return generateWithWebLLMStream(prompt, options);
    }
    return generateWithOllamaStream(prompt, options);
  }

  /**
   * Auto-detect best backend.
   * Priority: Ollama (if reachable) > WebLLM (if WebGPU available) > rule-based fallback
   */
  async function autoDetect() {
    // Check Ollama first (better quality)
    const ollama = await checkOllama();
    if (ollama.available && ollama.hasRequestedModel) {
      llmBackend = "ollama";
      return { backend: "ollama", ...ollama };
    }

    // Check WebLLM
    const webgpu = await checkWebGPU();
    if (webgpu.available) {
      llmBackend = "webllm";
      return { backend: "webllm", ...webgpu };
    }

    return { backend: "none", error: "无可用 LLM 后端" };
  }

  // ─── Fallback Report ────────────────────────────────────────────────────────

  function generateFallbackReport(assessment, view) {
    const viewLabel = view === "sagittal" ? "侧面（矢状面）" : "正面（冠状面）";
    const lines = [];
    lines.push(`## 体态评估报告（规则引擎生成）`);
    lines.push(`- 视角: ${viewLabel}`);
    lines.push(`- 综合评分: ${assessment.overall_score}/100`);
    lines.push(`- 风险等级: ${assessment.risk_level === 'low' ? '低' : assessment.risk_level === 'medium' ? '中' : '高'}`);
    lines.push(`- 力线等级: ${assessment.force_line_grade}`);
    lines.push("");

    lines.push("### 各区域评分");
    for (const [key, region] of Object.entries(assessment.regions)) {
      const icon = region.score >= 80 ? "✓" : region.score >= 60 ? "△" : "✗";
      lines.push(`- ${icon} ${region.name_zh}: ${region.score}/100 ${region.primary_issue ? "(问题: " + region.primary_issue.replace(/_/g, " ") + ")" : ""}`);
    }
    lines.push("");

    if (assessment.risk_flags.length > 0) {
      lines.push("### 发现的问题");
      for (const flag of assessment.risk_flags) {
        const icon = flag.severity === "severe" ? "●" : flag.severity === "moderate" ? "▲" : "○";
        lines.push(`- ${icon} ${flag.name_zh}: ${flag.label_zh}`);
      }
    } else {
      lines.push("### 未发现明显体态问题，各项指标在正常范围内。");
    }

    lines.push("");
    lines.push("### 建议");
    lines.push("请连接本地LLM（Ollama + Qwen 或开启 WebLLM 模式）获取个性化的矫正训练建议和详细分析报告。");
    return lines.join("\n");
  }

  // ─── Public ─────────────────────────────────────────────────────────────────

  return {
    // Config
    get backend() { return llmBackend; },
    set backend(v) { llmBackend = v; },
    get ollamaEndpoint() { return ollamaEndpoint; },
    set ollamaEndpoint(v) { ollamaEndpoint = v; },
    get ollamaModel() { return ollamaModel; },
    set ollamaModel(v) { ollamaModel = v; },
    get webllmModel() { return webllmModel; },
    set webllmModel(v) { webllmModel = v; },
    WEBLLM_MODELS,

    // Backend: Ollama
    generateWithOllama,
    generateWithOllamaStream,
    checkOllama,

    // Backend: WebLLM
    generateWithWebLLM,
    generateWithWebLLMStream,
    loadWebLLMEngine,
    unloadWebLLM,
    checkWebGPU,
    getWebLLMLoadProgress,

    // Unified
    generate,
    autoDetect,
    generateFallbackReport
  };
})();
