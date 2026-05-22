/**
 * Posture Assessment App — Main orchestrator.
 * Coordinates: Camera → MediaPipe → Analyzer → Visualizer → UI → LLM
 */

const PostureApp = (() => {
  // State
  let videoEl = null;
  let canvasEl = null;
  let ctx = null;
  let stream = null;
  let animFrameId = null;
  let currentView = "sagittal"; // "sagittal" | "frontal"
  let isRunning = false;
  let isPoseReady = false;
  let photoMode = false;        // true when viewing uploaded photo
  let lastLandmarks = null;
  let lastMetricValues = null;
  let lastAssessment = null;
  let snapshotData = null; // frozen assessment from capture

  // UI elements
  let elements = {};
  let savedCanvasSize = { w: 640, h: 480 };

  // ─── Camera Setup ───────────────────────────────────────────────────────────

  async function startCamera(facingMode = "environment") {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });
      videoEl.srcObject = stream;
      await videoEl.play();
      console.log("[App] Camera started:", facingMode);
      return true;
    } catch (err) {
      console.error("[App] Camera error:", err);
      showToast("无法访问摄像头: " + err.message, "error");
      return false;
    }
  }

  async function switchCamera() {
    const currentFacing = stream ? stream.getVideoTracks()[0]?.getSettings()?.facingMode : "environment";
    const newFacing = currentFacing === "user" ? "environment" : "user";
    stopCamera();
    await startCamera(newFacing);
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  // ─── Main Loop ──────────────────────────────────────────────────────────────

  function startLoop() {
    if (animFrameId) return;
    if (photoMode) {
      // Restore camera view from photo mode
      canvasEl.width = savedCanvasSize.w;
      canvasEl.height = savedCanvasSize.h;
      photoMode = false;
    }
    isRunning = true;
    updateButtonStates();
    loop();
  }

  function stopLoop() {
    isRunning = false;
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    updateButtonStates();
  }

  function loop() {
    if (!isRunning) return;

    const w = canvasEl.width;
    const h = canvasEl.height;

    // Detect pose
    let detectionResult = null;
    if (isPoseReady && videoEl.readyState >= 2) {
      detectionResult = PoseDetector.detect(videoEl, performance.now());
    }

    lastLandmarks = detectionResult ? detectionResult.landmarks : null;
    lastMetricValues = null;
    lastAssessment = null;

    // Analyze
    if (lastLandmarks) {
      lastMetricValues = PostureAnalyzer.calculateAll(lastLandmarks, currentView);
      if (lastMetricValues) {
        lastAssessment = evaluateAllMetrics(lastMetricValues, currentView);
      }
    }

    // Render
    Visualizer.render(ctx, videoEl, lastLandmarks, lastMetricValues, lastAssessment, currentView, w, h);

    // Update mini HUD
    updateMiniHud();

    animFrameId = requestAnimationFrame(loop);
  }

  // ─── Snapshot Capture ───────────────────────────────────────────────────────

  function captureSnapshot() {
    if (!lastAssessment || !lastMetricValues) {
      showToast("请确保人体在摄像头范围内且姿态清晰可见", "warning");
      return;
    }

    snapshotData = {
      timestamp: new Date().toISOString(),
      view: currentView,
      metrics: lastAssessment.metrics,
      assessment: lastAssessment
    };

    // Show report panel
    showReportPanel();
    showToast("评估已捕获!", "success");
  }

  // ─── View Switching ─────────────────────────────────────────────────────────

  function setView(view) {
    currentView = view;
    snapshotData = null;
    elements.viewToggleSagittal.classList.toggle("active", view === "sagittal");
    elements.viewToggleFrontal.classList.toggle("active", view === "frontal");
    elements.viewLabel.textContent = view === "sagittal" ? "侧面观" : "正面观";
    hideReportPanel();
  }

  // ─── Report Panel ───────────────────────────────────────────────────────────

  function showReportPanel() {
    if (!snapshotData) return;
    const a = snapshotData.assessment;
    const view = snapshotData.view;

    // Build metric detail HTML
    let metricsHTML = "";
    for (const [key, m] of Object.entries(a.metrics)) {
      const color = Visualizer.severityColor(m.severity);
      const valStr = typeof m.value === "number" ? m.value.toFixed(1) : m.value;
      metricsHTML += `
        <div class="metric-row" style="border-left: 3px solid ${color}">
          <div class="metric-name">${m.name_zh} <span class="metric-key">(${key})</span></div>
          <div class="metric-val" style="color:${color}">${valStr} ${m.unit}</div>
          <div class="metric-severity" style="color:${color}">${m.label_zh}</div>
          <div class="metric-normal">正常: ${m.normal_range[0]}-${m.normal_range[1]} ${m.unit}</div>
        </div>`;
    }

    // Region cards
    let regionsHTML = "";
    for (const [key, r] of Object.entries(a.regions)) {
      const color = r.score >= 80 ? "#00e676" : r.score >= 60 ? "#ff9800" : "#f44336";
      regionsHTML += `
        <div class="region-card" style="border-color:${color}">
          <div class="region-name">${r.name_zh}</div>
          <div class="region-score" style="color:${color}">${r.score}</div>
          <div class="region-issue">${r.primary_issue ? r.primary_issue.replace(/_/g, " ") : "正常"}</div>
        </div>`;
    }

    elements.reportContent.innerHTML = `
      <div class="report-summary">
        <div class="summary-item">
          <span class="summary-label">综合评分</span>
          <span class="summary-value" style="color:${a.overall_score >= 80 ? '#00e676' : a.overall_score >= 60 ? '#ff9800' : '#f44336'}">${a.overall_score}/100</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">风险等级</span>
          <span class="summary-value">${a.risk_level === 'low' ? '低' : a.risk_level === 'medium' ? '中' : '高'}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">力线等级</span>
          <span class="summary-value" style="color:${Visualizer.forceLineColor(a.force_line_grade)}">${a.force_line_grade}</span>
        </div>
      </div>
      <div class="report-regions">
        <h4>区域评分</h4>
        <div class="regions-grid">${regionsHTML}</div>
      </div>
      <div class="report-metrics">
        <h4>详细指标</h4>
        ${metricsHTML}
      </div>
    `;

    elements.reportPanel.classList.add("visible");
    elements.llmOutput.style.display = "none";
    elements.llmOutputText.textContent = "";
  }

  function hideReportPanel() {
    elements.reportPanel.classList.remove("visible");
  }

  // ─── LLM Report ─────────────────────────────────────────────────────────────

  async function generateLLMReport() {
    if (!snapshotData) {
      showToast("请先进行体态评估捕获", "warning");
      return;
    }

    const llmOutput = elements.llmOutput;
    const llmText = elements.llmOutputText;
    const progressBar = elements.llmProgressBar;
    const progressText = elements.llmProgressText;
    llmOutput.style.display = "block";
    elements.llmGenerateBtn.disabled = true;

    const prompt = buildLLMPrompt(snapshotData.assessment, snapshotData.view);

    try {
      if (LLMClient.backend === "webllm") {
        // ── WebLLM path ──
        elements.llmGenerateBtn.textContent = "下载模型中...";
        llmText.textContent = "";
        progressBar.style.display = "block";
        progressText.style.display = "block";

        const report = await LLMClient.generateWithWebLLM(prompt, {
          model: elements.llmWebllmModel ? elements.llmWebllmModel.value : undefined,
          onProgress: (report) => {
            const pct = Math.round(report.progress * 100);
            progressBar.value = report.progress;
            progressText.textContent = report.text || `加载中 ${pct}%`;
          },
          onToken: (token) => {
            llmText.textContent += token;
            llmText.scrollTop = llmText.scrollHeight;
          }
        });

        progressBar.style.display = "none";
        progressText.style.display = "none";
        if (!llmText.textContent.includes(report.substring(0, 50))) {
          llmText.textContent = report;
        }
        elements.llmGenerateBtn.textContent = "重新生成";
      } else {
        // ── Ollama path ──
        elements.llmGenerateBtn.textContent = "连接中...";
        llmText.textContent = "正在检查 Ollama 服务...";
        progressBar.style.display = "none";
        progressText.style.display = "none";

        const checkResult = await LLMClient.checkOllama();
        if (!checkResult.available) {
          // Try auto-fallback to WebLLM
          const webgpu = await LLMClient.checkWebGPU();
          if (webgpu.available) {
            llmText.textContent = "Ollama 不可用，切换到浏览器内置 WebLLM...\n首次使用需下载模型(~1GB)，请耐心等待。\n";
            LLMClient.backend = "webllm";
            elements.llmBackendSelect.value = "webllm";
            elements.llmGenerateBtn.disabled = false;
            generateLLMReport(); // retry with WebLLM
            return;
          }
          llmText.textContent = `⚠️ 无可用 LLM 后端\n\nOllama: ${checkResult.error}\nWebLLM: ${webgpu.error || '不可用'}\n\n使用规则引擎报告:\n\n${LLMClient.generateFallbackReport(snapshotData.assessment, snapshotData.view)}`;
          elements.llmGenerateBtn.disabled = false;
          elements.llmGenerateBtn.textContent = "重试";
          return;
        }

        llmText.textContent = "正在生成报告...\n\n";

        const report = await LLMClient.generateWithOllamaStream(prompt, {
          onToken: (token) => {
            llmText.textContent += token;
            llmText.scrollTop = llmText.scrollHeight;
          }
        });

        llmText.textContent = report;
        elements.llmGenerateBtn.textContent = "重新生成";
      }
    } catch (err) {
      console.error("[App] LLM error:", err);
      progressBar.style.display = "none";
      progressText.style.display = "none";
      let hint = "";
      if (LLMClient.backend === "webllm") {
        hint = "\n\n⚠️ WebLLM 需要访问 Hugging Face 下载模型，国内网络可能被墙。\n建议切换为 Ollama 后端：电脑运行 ollama serve，手机连同一 WiFi 访问。\n";
      } else {
        hint = "\n\n💡 提示：请确保 Ollama 正在运行（ollama serve），且地址正确。\n可在设置中检查 Ollama 服务地址。\n";
      }
      llmText.textContent = `生成失败: ${err.message}${hint}\n\n--- 规则引擎报告 ---\n\n${LLMClient.generateFallbackReport(snapshotData.assessment, snapshotData.view)}`;
      elements.llmGenerateBtn.textContent = "重试";
    } finally {
      elements.llmGenerateBtn.disabled = false;
    }
  }

  // ─── UI Helpers ─────────────────────────────────────────────────────────────

  function updateMiniHud() {
    if (!elements.scoreBadge) return;
    if (lastAssessment) {
      elements.scoreBadge.textContent = lastAssessment.overall_score;
      elements.scoreBadge.style.color = lastAssessment.overall_score >= 80 ? "#00e676" :
        lastAssessment.overall_score >= 60 ? "#ff9800" : "#f44336";
      elements.flBadge.textContent = lastAssessment.force_line_grade;
      elements.flBadge.style.color = Visualizer.forceLineColor(lastAssessment.force_line_grade);
      elements.statusDot.style.background = "#00e676";
      elements.statusText.textContent = "检测中";
    } else if (lastLandmarks) {
      elements.statusDot.style.background = "#ff9800";
      elements.statusText.textContent = "分析中...";
      elements.scoreBadge.textContent = "--";
      elements.flBadge.textContent = "--";
    } else {
      elements.statusDot.style.background = "#f44336";
      elements.statusText.textContent = "未检测到人体";
      elements.scoreBadge.textContent = "--";
      elements.flBadge.textContent = "--";
    }
  }

  function updateButtonStates() {
    if (elements.startBtn) {
      elements.startBtn.textContent = isRunning ? "暂停分析" : "开始分析";
      elements.startBtn.classList.toggle("running", isRunning);
    }
  }

  // ─── Photo Upload ───────────────────────────────────────────────────────────

  async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    showToast("正在分析照片...", "info");
    stopLoop();

    try {
      // Load image
      const img = new Image();
      const url = URL.createObjectURL(file);
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      URL.revokeObjectURL(url);

      // Resize canvas to image, enter photo mode
      photoMode = true;
      canvasEl.width = img.width;
      canvasEl.height = img.height;
      ctx.drawImage(img, 0, 0, img.width, img.height);

      // Run IMAGE mode detection (create temporary landmarker)
      const result = await PoseDetector.detectImage(img);
      if (!result) {
        showToast("照片中未检测到人体，请确保全身清晰可见", "warning");
        canvasEl.width = savedCanvasSize.w;
        canvasEl.height = savedCanvasSize.h;
        startLoop();
        return;
      }

      lastLandmarks = result.landmarks;
      lastMetricValues = PostureAnalyzer.calculateAll(lastLandmarks, currentView);

      if (!lastMetricValues) {
        showToast("姿态关键点不全，请确保全身在画面中", "warning");
        canvasEl.width = savedCanvasSize.w;
        canvasEl.height = savedCanvasSize.h;
        startLoop();
        return;
      }

      lastAssessment = evaluateAllMetrics(lastMetricValues, currentView);

      // Render
      Visualizer.render(ctx, null, lastLandmarks, lastMetricValues, lastAssessment, currentView, img.width, img.height);

      // Auto-capture
      snapshotData = {
        timestamp: new Date().toISOString(),
        view: currentView,
        metrics: lastAssessment.metrics,
        assessment: lastAssessment
      };
      showReportPanel();
      updateMiniHud();
      showToast("照片分析完成！", "success");

    } catch (err) {
      console.error("[App] Photo upload error:", err);
      showToast("照片分析失败: " + err.message, "error");
    } finally {
      elements.photoInput.value = "";
    }
  }

  function showToast(message, type = "info") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast toast-${type} visible`;
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove("visible");
    }, 2500);
  }

  // ─── Initialization ─────────────────────────────────────────────────────────

  async function init() {
    // Cache DOM elements
    videoEl = document.getElementById("video");
    canvasEl = document.getElementById("output");
    ctx = canvasEl.getContext("2d");

    elements = {
      startBtn: document.getElementById("btn-start"),
      captureBtn: document.getElementById("btn-capture"),
      switchCamBtn: document.getElementById("btn-switch-camera"),
      viewToggleSagittal: document.getElementById("btn-view-sagittal"),
      viewToggleFrontal: document.getElementById("btn-view-frontal"),
      llmGenerateBtn: document.getElementById("btn-llm-generate"),
      llmCloseBtn: document.getElementById("btn-llm-close"),
      reportCloseBtn: document.getElementById("btn-report-close"),
      reportPanel: document.getElementById("report-panel"),
      reportContent: document.getElementById("report-content"),
      llmOutput: document.getElementById("llm-output"),
      llmOutputText: document.getElementById("llm-output-text"),
      llmProgressBar: document.getElementById("llm-progress-bar"),
      llmProgressText: document.getElementById("llm-progress-text"),
      viewLabel: document.getElementById("view-label"),
      scoreBadge: document.getElementById("score-badge"),
      flBadge: document.getElementById("fl-badge"),
      statusDot: document.getElementById("status-dot"),
      statusText: document.getElementById("status-text"),
      llmSettingsBtn: document.getElementById("btn-llm-settings"),
      llmSettingsPanel: document.getElementById("llm-settings-panel"),
      llmBackendSelect: document.getElementById("llm-backend"),
      llmEndpointGroup: document.getElementById("llm-endpoint-group"),
      llmOllamaModelGroup: document.getElementById("llm-ollama-model-group"),
      llmWebllmGroup: document.getElementById("llm-webllm-group"),
      llmEndpointInput: document.getElementById("llm-endpoint"),
      llmOllamaModelInput: document.getElementById("llm-ollama-model"),
      llmWebllmModel: document.getElementById("llm-webllm-model"),
      llmSettingsSave: document.getElementById("btn-llm-settings-save"),
      photoInput: document.getElementById("photo-input"),
      photoUploadBtn: document.getElementById("btn-photo-upload"),
      llmTestBtn: document.getElementById("btn-llm-test"),
      llmPullBtn: document.getElementById("btn-llm-pull"),
      llmTestResult: document.getElementById("llm-test-result")
    };

    // Set canvas size
    function resizeCanvas() {
      if (photoMode) return;
      const rect = canvasEl.parentElement.getBoundingClientRect();
      canvasEl.width = rect.width;
      canvasEl.height = rect.height;
      savedCanvasSize.w = rect.width;
      savedCanvasSize.h = rect.height;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Event bindings
    elements.startBtn.addEventListener("click", () => {
      if (isRunning) stopLoop();
      else startLoop();
    });

    elements.captureBtn.addEventListener("click", captureSnapshot);
    elements.switchCamBtn.addEventListener("click", switchCamera);

    elements.viewToggleSagittal.addEventListener("click", () => setView("sagittal"));
    elements.viewToggleFrontal.addEventListener("click", () => setView("frontal"));

    elements.reportCloseBtn.addEventListener("click", hideReportPanel);
    elements.llmGenerateBtn.addEventListener("click", generateLLMReport);
    elements.llmCloseBtn.addEventListener("click", () => {
      elements.llmOutput.style.display = "none";
    });

    // Photo upload
    elements.photoUploadBtn.addEventListener("click", () => {
      elements.photoInput.click();
    });
    elements.photoInput.addEventListener("change", handlePhotoUpload);

    // LLM Settings
    elements.llmSettingsBtn.addEventListener("click", () => {
      elements.llmSettingsPanel.classList.toggle("visible");
      elements.llmBackendSelect.value = LLMClient.backend;
      elements.llmEndpointInput.value = LLMClient.ollamaEndpoint;
      elements.llmOllamaModelInput.value = LLMClient.ollamaModel;
      // Populate WebLLM model dropdown
      elements.llmWebllmModel.innerHTML = LLMClient.WEBLLM_MODELS.map(m =>
        `<option value="${m.id}" ${m.id === LLMClient.webllmModel ? 'selected' : ''}>${m.name} (${m.size})</option>`
      ).join("");
      elements.llmWebllmModel.value = LLMClient.webllmModel;
      updateLLMSettingsUI();
    });

    elements.llmBackendSelect.addEventListener("change", () => {
      updateLLMSettingsUI();
    });

    // Test Ollama connection
    elements.llmTestBtn.addEventListener("click", async () => {
      const resultEl = elements.llmTestResult;
      const endpoint = elements.llmEndpointInput.value;
      const model = elements.llmOllamaModelInput.value;
      resultEl.style.display = "block";
      resultEl.style.color = "#ff9800";
      resultEl.textContent = "⏳ 检测中...";

      try {
        const resp = await fetch(endpoint.replace("/api/generate", "/api/tags"), {
          signal: AbortSignal.timeout(5000)
        });
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        const data = await resp.json();
        const models = (data.models || []).map(m => m.name);
        const hasModel = models.some(m => m.startsWith(model.split(":")[0]));
        if (hasModel) {
          resultEl.style.color = "#00e676";
          resultEl.textContent = `✅ 连接成功！模型 "${model}" 已就绪。可用模型: ${models.join(", ")}`;
        } else {
          resultEl.style.color = "#ff9800";
          resultEl.textContent = `⚠️ 服务在线，但模型 "${model}" 未安装。可用: ${models.join(", ") || "无"}`;
          elements.llmPullBtn.style.display = "inline-block";
        }
      } catch (e) {
        resultEl.style.color = "#f44336";
        resultEl.textContent = `❌ 无法连接: ${e.message}。请确认：\n1. 电脑已运行 ollama serve\n2. 地址正确（手机填电脑IP）\n3. 手机和电脑同一WiFi`;
      }
    });

    // Pull model hint
    elements.llmPullBtn.addEventListener("click", () => {
      const model = elements.llmOllamaModelInput.value;
      elements.llmTestResult.style.display = "block";
      elements.llmTestResult.style.color = "#ff9800";
      elements.llmTestResult.textContent = `请在电脑终端运行：\n\n  ollama pull ${model}\n\n下载完成后点击「测试连接」验证。`;
    });

    function updateLLMSettingsUI() {
      const isWebLLM = elements.llmBackendSelect.value === "webllm";
      elements.llmEndpointGroup.style.display = isWebLLM ? "none" : "block";
      elements.llmOllamaModelGroup.style.display = isWebLLM ? "none" : "block";
      elements.llmWebllmGroup.style.display = isWebLLM ? "block" : "none";
    }

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        captureSnapshot();
      } else if (e.key === "v" || e.key === "V") {
        setView(currentView === "sagittal" ? "frontal" : "sagittal");
      }
    });

    // Initialize MediaPipe
    elements.statusText.textContent = "加载 WASM...";
    try {
      await PoseDetector.init({
        delegate: "GPU",
        onStatus: (msg) => { elements.statusText.textContent = msg; }
      });
      isPoseReady = true;
      elements.statusText.textContent = "就绪";
      elements.statusDot.style.background = "#00e676";
      showToast("模型加载完成", "success");
    } catch (err) {
      console.error("[App] PoseDetector init failed:", err);
      // Show error directly on status bar so user can see without console
      elements.statusText.textContent = "GPU失败: " + (err.message || err);
      // Try CPU fallback
      try {
        showToast("GPU失败，尝试CPU...", "warning");
        await PoseDetector.init({
          delegate: "CPU",
          onStatus: (msg) => { elements.statusText.textContent = msg; }
        });
        isPoseReady = true;
        elements.statusText.textContent = "就绪(CPU)";
        elements.statusDot.style.background = "#ff9800";
        showToast("模型加载完成(CPU)", "success");
      } catch (err2) {
        elements.statusText.textContent = "加载失败! " + (err2.message || err2);
        elements.statusDot.style.background = "#f44336";
        showToast("模型加载失败，请刷新重试", "error");
        elements.startBtn.disabled = true;
      }
    }

    // Start camera
    await startCamera("environment");

    // Auto-start loop
    startLoop();
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  return {
    init,
    startLoop,
    stopLoop,
    captureSnapshot,
    setView,
    get currentView() { return currentView; },
    get isRunning() { return isRunning; },
    get lastAssessment() { return lastAssessment; },
    get snapshotData() { return snapshotData; }
  };
})();

// Boot
document.addEventListener("DOMContentLoaded", () => {
  PostureApp.init();
});
