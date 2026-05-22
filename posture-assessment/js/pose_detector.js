/**
 * MediaPipe Pose Landmarker Web Integration
 * Uses @mediapipe/tasks-vision WASM (loaded via CDN).
 * Provides the same 33-keypoint output as the Python projects.
 */

const PoseDetector = (() => {
  let poseLandmarker = null;
  let isReady = false;
  let loadingPromise = null;
  let cachedWasmFileset = null;  // cached for creating IMAGE-mode detector
  let cachedModelPath = null;

  // MediaPipe 33 landmark name → index mapping (same as cccc projects)
  const LANDMARK_NAMES = {
    nose: 0,
    left_eye_inner: 1, left_eye: 2, left_eye_outer: 3,
    right_eye_inner: 4, right_eye: 5, right_eye_outer: 6,
    left_ear: 7, right_ear: 8,
    mouth_left: 9, mouth_right: 10,
    left_shoulder: 11, right_shoulder: 12,
    left_elbow: 13, right_elbow: 14,
    left_wrist: 15, right_wrist: 16,
    left_pinky: 17, right_pinky: 18,
    left_index: 19, right_index: 20,
    left_thumb: 21, right_thumb: 22,
    left_hip: 23, right_hip: 24,
    left_knee: 25, right_knee: 26,
    left_ankle: 27, right_ankle: 28,
    left_heel: 29, right_heel: 30,
    left_foot_index: 31, right_foot_index: 32
  };

  const INDEX_TO_NAME = {};
  for (const [name, idx] of Object.entries(LANDMARK_NAMES)) {
    INDEX_TO_NAME[idx] = name;
  }

  // WASM configuration — multiple CDN mirrors for China accessibility
  const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
  const WASM_FALLBACK = "https://unpkg.com/@mediapipe/tasks-vision@0.10.18/wasm";

  // Model sources — tried in order until one succeeds
  const MODEL_SOURCES = [
    "./models/pose_landmarker_lite.task",     // local lite (5.6MB, pushable to GitHub)
    "./models/pose_landmarker_heavy.task",    // local heavy (30MB, local dev only)
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task"
  ];

  /**
   * Initialize the pose landmarker.
   * @param {object} options
   * @param {string} options.modelPath - override URL for the .task model file
   * @param {string} options.delegate - "GPU" | "CPU"
   * @param {function} options.onStatus - callback(statusText)
   */
  async function init(options = {}) {
    if (isReady) return true;
    if (loadingPromise) return loadingPromise;

    const onStatus = options.onStatus || (() => {});
    const wasmPrimary = options.wasmPath || WASM_BASE;
    const wasmFallback = options.wasmFallback || WASM_FALLBACK;

    loadingPromise = (async () => {
      const TIMEOUT_MS = 30000; // 30s timeout

      // Helper: race a promise against a timeout
      const withTimeout = (promise, label) => {
        return Promise.race([
          promise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`超时: ${label}`)), TIMEOUT_MS)
          )
        ]);
      };

      // 1) Load WASM (try primary CDN, fallback to unpkg for China)
      let wasmFileset;
      onStatus("加载 WASM...");
      try {
        const visionModule = await withTimeout(
          import("@mediapipe/tasks-vision"),
          "ES模块导入"
        );
        const { PoseLandmarker, FilesetResolver } = visionModule;
        try {
          wasmFileset = await withTimeout(
            FilesetResolver.forVisionTasks(wasmPrimary),
            "WASM 下载(主)"
          );
        } catch (e) {
          console.warn("[PoseDetector] Primary WASM CDN failed, trying fallback...", e.message);
          onStatus("切换备用CDN...");
          wasmFileset = await withTimeout(
            FilesetResolver.forVisionTasks(wasmFallback),
            "WASM 下载(备)"
          );
        }

        // 2) Load pose model — try multiple sources until one works
        const modelSources = options.modelPath
          ? [options.modelPath]
          : MODEL_SOURCES;
        let lastError = null;

        for (const modelUrl of modelSources) {
          onStatus("加载模型: " + modelUrl.split("/").pop());
          try {
            poseLandmarker = await withTimeout(
              PoseLandmarker.createFromOptions(wasmFileset, {
                baseOptions: {
                  modelAssetPath: modelUrl,
                  delegate: options.delegate || "GPU"
                },
                runningMode: "VIDEO",
                numPoses: 1,
                minPoseDetectionConfidence: 0.3,
                minPosePresenceConfidence: 0.3,
                minTrackingConfidence: 0.3
              }),
              "模型加载(" + modelUrl.split("/").pop() + ")"
            );
            console.log("[PoseDetector] Model loaded from:", modelUrl);
            cachedWasmFileset = wasmFileset;
            cachedModelPath = modelUrl;
            break; // success, stop trying
          } catch (e) {
            console.warn("[PoseDetector] Failed to load from:", modelUrl, e.message);
            lastError = e;
          }
        }

        if (!poseLandmarker) {
          throw new Error("所有模型源加载失败: " + (lastError ? lastError.message : "未知错误"));
        }
      } catch (err) {
        console.error("[PoseDetector] Model load failed:", err);
        loadingPromise = null;
        throw new Error("模型加载失败: " + err.message);
      }

      isReady = true;
      console.log("[PoseDetector] Ready.");
      return true;
    })();

    return loadingPromise;
  }

  /**
   * Process a video frame and return landmarks.
   * @param {HTMLVideoElement} video
   * @param {number} timestamp - performance.now() or Date.now()
   * @returns {object|null} { landmarks: { name: {x, y, z, visibility} }, timestamp_ms, raw }
   */
  function detect(video, timestamp) {
    if (!isReady || !poseLandmarker) return null;

    const result = poseLandmarker.detectForVideo(video, timestamp);
    if (!result || !result.landmarks || result.landmarks.length === 0) {
      return null;
    }

    const raw = result.landmarks[0]; // first (and only) person
    const landmarks = {};

    for (let i = 0; i < raw.length; i++) {
      const name = INDEX_TO_NAME[i];
      if (name) {
        landmarks[name] = {
          x: raw[i].x,
          y: raw[i].y,
          z: raw[i].z,
          visibility: raw[i].visibility
        };
      }
    }

    return {
      landmarks,
      timestamp_ms: timestamp,
      raw: raw,
      world_landmarks: result.worldLandmarks ? result.worldLandmarks[0] : null
    };
  }

  /**
   * Check if specific landmarks are visible enough for analysis.
   * @param {object} landmarks - from detect()
   * @param {string[]} requiredNames - landmark names that must be visible
   * @param {number} minVisibility - threshold (0-1), default 0.5
   * @returns {boolean}
   */
  function areLandmarksVisible(landmarks, requiredNames, minVisibility = 0.5) {
    if (!landmarks) return false;
    for (const name of requiredNames) {
      const lm = landmarks[name];
      if (!lm || lm.visibility < minVisibility) return false;
    }
    return true;
  }

  /**
   * Get midpoint of two landmarks (used extensively in analysis).
   * @param {object} a - {x, y}
   * @param {object} b - {x, y}
   * @returns {{x: number, y: number}}
   */
  function midpoint(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  /**
   * Run detection on a static image. Creates a temporary IMAGE-mode landmarker.
   * @param {HTMLImageElement|HTMLCanvasElement} image
   * @returns {object|null} same format as detect()
   */
  async function detectImage(image) {
    if (!cachedWasmFileset || !cachedModelPath) {
      throw new Error("PoseDetector not initialized. Call init() first.");
    }

    const { PoseLandmarker } = await import("@mediapipe/tasks-vision");

    const imageLandmarker = await PoseLandmarker.createFromOptions(cachedWasmFileset, {
      baseOptions: { modelAssetPath: cachedModelPath, delegate: "GPU" },
      runningMode: "IMAGE",
      numPoses: 1,
      minPoseDetectionConfidence: 0.3,
      minPosePresenceConfidence: 0.3,
      minTrackingConfidence: 0.3
    });

    try {
      const result = imageLandmarker.detect(image);
      if (!result || !result.landmarks || result.landmarks.length === 0) {
        return null;
      }

      const raw = result.landmarks[0];
      const landmarks = {};
      for (let i = 0; i < raw.length; i++) {
        const name = INDEX_TO_NAME[i];
        if (name) {
          landmarks[name] = {
            x: raw[i].x, y: raw[i].y, z: raw[i].z,
            visibility: raw[i].visibility
          };
        }
      }

      return { landmarks, timestamp_ms: Date.now(), raw, world_landmarks: result.worldLandmarks?.[0] || null };
    } finally {
      imageLandmarker.close();
    }
  }

  function dispose() {
    if (poseLandmarker) {
      poseLandmarker.close();
      poseLandmarker = null;
    }
    isReady = false;
    loadingPromise = null;
  }

  return {
    init,
    detect,
    detectImage,
    areLandmarksVisible,
    midpoint,
    LANDMARK_NAMES,
    INDEX_TO_NAME,
    dispose,
    get isReady() { return isReady; }
  };
})();
