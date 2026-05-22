/**
 * MediaPipe Pose Landmarker Web Integration
 * Uses @mediapipe/tasks-vision WASM (loaded via CDN).
 * Provides the same 33-keypoint output as the Python projects.
 */

const PoseDetector = (() => {
  let poseLandmarker = null;
  let isReady = false;
  let loadingPromise = null;

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
  const MODEL_URL = "./models/pose_landmarker_heavy.task";  // local file, avoids Google CDN blockage

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
      // 1) Load WASM (try primary CDN, fallback to unpkg for China)
      let wasmFileset;
      onStatus("加载 WASM...");
      try {
        const visionModule = await import("@mediapipe/tasks-vision");
        const { PoseLandmarker, FilesetResolver } = visionModule;
        try {
          wasmFileset = await FilesetResolver.forVisionTasks(wasmPrimary);
        } catch (e) {
          console.warn("[PoseDetector] Primary WASM CDN failed, trying fallback...", e.message);
          wasmFileset = await FilesetResolver.forVisionTasks(wasmFallback);
        }

        // 2) Load pose model from local file
        onStatus("加载模型文件...");
        poseLandmarker = await PoseLandmarker.createFromOptions(wasmFileset, {
          baseOptions: {
            modelAssetPath: options.modelPath || MODEL_URL,
            delegate: options.delegate || "GPU"
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
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
    areLandmarksVisible,
    midpoint,
    LANDMARK_NAMES,
    INDEX_TO_NAME,
    dispose,
    get isReady() { return isReady; }
  };
})();
