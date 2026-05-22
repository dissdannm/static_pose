/**
 * Posture Analyzer — Angle calculation + Alignment metrics.
 * Ported from:
 *   - Force_Analysis_System/analysis/angle_calculator.py
 *   - Force_Analysis_System/analysis/alignment_analyzer.py
 *   - Sports_Analysis_Force_line/project/analysis/angle_calculator.py
 *   - Sports_Analysis_Force_line/project/analysis/alignment_analyzer.py
 *   - Sports_Analysis_Force_line/project/utils/math_utils.py
 */

const PostureAnalyzer = (() => {

  // ═══ Math Utilities (from math_utils.py) ══════════════════════════════════════

  /** Calculate angle between vectors p1->vertex and vertex->p3 in degrees */
  function calculateAngle(p1, vertex, p3) {
    const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y };
    const v2 = { x: p3.x - vertex.x, y: p3.y - vertex.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    if (mag1 < 1e-9 || mag2 < 1e-9) return 0;
    const cosVal = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    return Math.acos(cosVal) * (180 / Math.PI);
  }

  /** Angle of a line relative to horizontal, in degrees */
  function angleWithHorizontal(start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    return Math.atan2(Math.abs(dy), Math.abs(dx)) * (180 / Math.PI);
  }

  /** Angle of a line relative to vertical (90 = horizontal, 0 = vertical) */
  function angleWithVertical(start, end) {
    return 90 - angleWithHorizontal(start, end);
  }

  /** Safe ratio: num / den, fallback to defaultVal */
  function safeRatio(num, den, defaultVal = 0) {
    if (Math.abs(den) < 1e-9) return defaultVal;
    return num / den;
  }

  /** Vertical gap at midpoint of line(a,b) relative to reference point */
  function lineMidpointVerticalGap(a, b, ref) {
    const midY = (a.y + b.y) / 2;
    return Math.abs(midY - ref.y);
  }

  // ═══ Sagittal View Metrics (Side View) ═══════════════════════════════════════

  /**
   * Craniovertebral Angle (CVA).
   * Angle between vertical line through C7 (approx. shoulder) and line from ear to shoulder.
   * Smaller = more forward head. Normal >= 50 deg.
   * landmarks needed: ear of visible side, shoulder of visible side
   */
  function calcCVA(ear, shoulder) {
    // CVA: angle between horizontal (anterior direction) and line from C7→tragus.
    // In image coords this is atan2(|dy|, |dx|): angle from horizontal up to ear.
    // Normal >= 50° (ear mostly above shoulder, not far forward).
    const dx = Math.abs(ear.x - shoulder.x);
    const dy = Math.abs(ear.y - shoulder.y);
    return Math.atan2(dy, dx) * (180 / Math.PI);
  }

  /**
   * Neck forward offset.
   * Horizontal distance from nose to shoulder midpoint (normalized).
   */
  function calcNeckForwardOffset(nose, shoulderMid) {
    return nose.x - shoulderMid.x;
  }

  /**
   * Shoulder angle (protraction).
   * Angle at shoulder between line to ear and line to hip.
   * Smaller = more rounded shoulders. Normal >= 52 deg.
   */
  function calcShoulderAngle(ear, shoulder) {
    // Forward shoulder angle: angle of ear→shoulder line from vertical.
    // 0° = ear directly above shoulder (ideal). Larger = more rounded shoulders.
    const dx = Math.abs(ear.x - shoulder.x);
    const dy = Math.abs(ear.y - shoulder.y);
    return Math.atan2(dx, dy) * (180 / Math.PI);
  }

  /**
   * Trunk inclination angle from vertical.
   * How far the trunk (shoulderMid -> hipMid) leans forward.
   */
  function calcTrunkTiltAngle(shoulderMid, hipMid) {
    return angleWithVertical(shoulderMid, hipMid);
  }

  /**
   * Hip angle (shoulder-hip-knee).
   * Standing: normal 160-180 deg. Less = anterior pelvic tilt.
   */
  function calcHipAngle(shoulder, hip, knee) {
    return calculateAngle(shoulder, hip, knee);
  }

  /**
   * Knee angle (hip-knee-ankle).
   * Standing: normal 170-180 deg.
   */
  function calcKneeAngle(hip, knee, ankle) {
    return calculateAngle(hip, knee, ankle);
  }

  /**
   * Ankle angle (knee-ankle-footIndex).
   * Normal: 85-95 deg.
   */
  function calcAnkleAngle(knee, ankle, footIndex) {
    return calculateAngle(knee, ankle, footIndex);
  }

  /**
   * Body force line angle (shoulderMid -> hipMid -> ankleMid).
   * Ideal: 180 deg (straight line).
   */
  function calcBodyLineAngle(shoulderMid, hipMid, ankleMid) {
    return calculateAngle(shoulderMid, hipMid, ankleMid);
  }

  /**
   * Neck flexion angle.
   * Angle at shoulderMid between nose and hipMid.
   * Indicates neck compensation. Normal < 20 deg.
   */
  function calcNeckFlexionAngle(nose, shoulderMid, hipMid) {
    return calculateAngle(nose, shoulderMid, hipMid);
  }

  /**
   * Lumbar gap distance.
   * Vertical gap at trunk midpoint relative to hip.
   * Proxy for lumbar lordosis.
   */
  function calcLumbarGap(shoulderMid, hipMid) {
    return lineMidpointVerticalGap(shoulderMid, hipMid, hipMid);
  }

  /**
   * Plumb line deviation.
   * How far the ear deviates from the ideal plumb line (vertical from ankle).
   * Measures overall postural alignment in sagittal plane.
   */
  function calcPlumbLineDeviation(ear, shoulderMid, hipMid, knee, ankle) {
    // Ideal: ear, shoulder, hip, knee, ankle vertically aligned over ankle
    // Deviation = sum of absolute x-differences from ankle vertical
    const ref = ankle.x;
    const deviations = [
      Math.abs(ear.x - ref),
      Math.abs(shoulderMid.x - ref),
      Math.abs(hipMid.x - ref),
      Math.abs(knee.x - ref)
    ];
    return deviations.reduce((a, b) => a + b, 0) / deviations.length;
  }

  /**
   * Pelvic tilt approximation in sagittal view.
   * Ratio of horizontal to vertical shoulder-hip vector.
   */
  function calcPelvicTilt(shoulderMid, hipMid) {
    const dx = shoulderMid.x - hipMid.x;
    const dy = shoulderMid.y - hipMid.y;
    return safeRatio(dx, Math.abs(dy));
  }

  // ═══ Frontal View Metrics (Front View) ═══════════════════════════════════════

  /**
   * Head tilt angle.
   * Angle of ear-to-ear line relative to horizontal.
   */
  function calcHeadTilt(leftEar, rightEar) {
    if (!leftEar || !rightEar) return 0;
    return angleWithHorizontal(leftEar, rightEar);
  }

  /**
   * Shoulder height difference.
   * Normalized Y difference between left and right shoulders.
   */
  function calcShoulderHeightDiff(leftShoulder, rightShoulder) {
    return Math.abs(leftShoulder.y - rightShoulder.y);
  }

  /**
   * Trunk lateral lean (frontal).
   * Horizontal offset of shoulderMid vs hipMid.
   */
  function calcTrunkLateralLean(shoulderMid, hipMid) {
    const dx = shoulderMid.x - hipMid.x;
    const dy = shoulderMid.y - hipMid.y;
    return safeRatio(dx, Math.abs(dy));
  }

  /**
   * Pelvic obliquity (frontal).
   * Y difference between left and right hips.
   */
  function calcPelvisObliquity(leftHip, rightHip) {
    return Math.abs(leftHip.y - rightHip.y);
  }

  /**
   * Body center offset (frontal).
   * Hip midpoint x relative to ankle midpoint x.
   */
  function calcCenterOffset(hipMid, ankleMid) {
    return hipMid.x - ankleMid.x;
  }

  /**
   * Knee offset (valgus/varus).
   * Lateral deviation of knee from hip-ankle reference line.
   */
  function calcKneeOffset(hip, knee, ankle) {
    const refX = (hip.x + ankle.x) / 2;
    return knee.x - refX;
  }

  /**
   * Knee angle difference (symmetry).
   */
  function calcKneeAngleDiff(leftKneeAngle, rightKneeAngle) {
    return Math.abs(leftKneeAngle - rightKneeAngle);
  }

  /**
   * Ankle symmetry (height difference).
   */
  function calcAnkleSymmetry(leftAnkle, rightAnkle) {
    return Math.abs(leftAnkle.y - rightAnkle.y);
  }

  // ═══ Master Calculation ══════════════════════════════════════════════════════

  /**
   * Calculate all metrics for a given view from detected landmarks.
   * @param {object} lm - named landmarks from PoseDetector.detect()
   * @param {string} view - "sagittal" | "frontal"
   * @returns {object} { metricKey: value, ... } or null if required landmarks missing
   */
  function calculateAll(lm, view) {
    if (!lm) return null;

    const required = (view === "sagittal")
      ? ["left_ear", "nose", "left_shoulder", "left_hip", "left_knee", "left_ankle", "left_foot_index", "right_shoulder", "right_hip"]
      : ["left_ear", "right_ear", "left_shoulder", "right_shoulder", "left_hip", "right_hip", "left_knee", "right_knee", "left_ankle", "right_ankle"];

    // Check visibility
    for (const name of required) {
      if (!lm[name] || lm[name].visibility < 0.3) return null;
    }

    if (view === "sagittal") {
      // Use LEFT side for sagittal (assuming subject faces right)
      const ear = lm["left_ear"];
      const nose = lm["nose"];
      const shoulder = lm["left_shoulder"];
      const hip = lm["left_hip"];
      const knee = lm["left_knee"];
      const ankle = lm["left_ankle"];
      const footIndex = lm["left_foot_index"];
      const shoulderMid = PoseDetector.midpoint(lm["left_shoulder"], lm["right_shoulder"]);
      const hipMid = PoseDetector.midpoint(lm["left_hip"], lm["right_hip"]);
      const ankleMid = PoseDetector.midpoint(lm["left_ankle"], lm["right_ankle"]);

      return {
        // Head & Neck
        cva: calcCVA(ear, shoulder),
        neck_forward_offset: calcNeckForwardOffset(nose, shoulderMid),
        neck_flexion_angle: calcNeckFlexionAngle(nose, shoulderMid, hipMid),
        // Shoulders & Upper Back
        shoulder_angle: calcShoulderAngle(ear, shoulder),
        trunk_tilt_angle: calcTrunkTiltAngle(shoulderMid, hipMid),
        // Pelvis & Core
        hip_angle: calcHipAngle(shoulder, hip, knee),
        body_line_angle: calcBodyLineAngle(shoulderMid, hipMid, ankleMid),
        lumbar_gap: calcLumbarGap(shoulderMid, hipMid),
        pelvic_tilt: calcPelvicTilt(shoulderMid, hipMid),
        plumb_line_deviation: calcPlumbLineDeviation(ear, shoulderMid, hipMid, knee, ankle),
        // Lower Limbs
        knee_angle: calcKneeAngle(hip, knee, ankle),
        ankle_angle: calcAnkleAngle(knee, ankle, footIndex)
      };
    }

    // Frontal view
    const leftEar = lm["left_ear"];
    const rightEar = lm["right_ear"];
    const leftShoulder = lm["left_shoulder"];
    const rightShoulder = lm["right_shoulder"];
    const leftHip = lm["left_hip"];
    const rightHip = lm["right_hip"];
    const leftKnee = lm["left_knee"];
    const rightKnee = lm["right_knee"];
    const leftAnkle = lm["left_ankle"];
    const rightAnkle = lm["right_ankle"];

    const shoulderMid = PoseDetector.midpoint(leftShoulder, rightShoulder);
    const hipMid = PoseDetector.midpoint(leftHip, rightHip);
    const ankleMid = PoseDetector.midpoint(leftAnkle, rightAnkle);

    const leftKneeAngle = calcKneeAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = calcKneeAngle(rightHip, rightKnee, rightAnkle);

    return {
      // Head & Neck
      head_tilt: calcHeadTilt(leftEar, rightEar),
      // Shoulders & Upper Back
      shoulder_height_diff: calcShoulderHeightDiff(leftShoulder, rightShoulder),
      trunk_tilt: calcTrunkLateralLean(shoulderMid, hipMid),
      // Pelvis & Core
      pelvis_tilt: calcPelvisObliquity(leftHip, rightHip),
      center_offset: calcCenterOffset(hipMid, ankleMid),
      // Lower Limbs
      knee_offset_left: calcKneeOffset(leftHip, leftKnee, leftAnkle),
      knee_offset_right: calcKneeOffset(rightHip, rightKnee, rightAnkle),
      knee_angle_diff: calcKneeAngleDiff(leftKneeAngle, rightKneeAngle),
      ankle_symmetry: calcAnkleSymmetry(leftAnkle, rightAnkle)
    };
  }

  return {
    calculateAll,
    // Individual calculators (for debugging / custom use)
    calcCVA, calcNeckForwardOffset, calcShoulderAngle,
    calcTrunkTiltAngle, calcHipAngle, calcKneeAngle,
    calcAnkleAngle, calcBodyLineAngle, calcNeckFlexionAngle,
    calcLumbarGap, calcPlumbLineDeviation, calcPelvicTilt,
    calcHeadTilt, calcShoulderHeightDiff, calcTrunkLateralLean,
    calcPelvisObliquity, calcCenterOffset, calcKneeOffset,
    calcKneeAngleDiff, calcAnkleSymmetry,
    calculateAngle, angleWithHorizontal, angleWithVertical,
    safeRatio, lineMidpointVerticalGap
  };
})();
