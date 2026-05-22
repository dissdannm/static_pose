/**
 * Canvas Visualizer — Skeleton overlay + Force line rendering.
 * Ported from:
 *   - Force_Analysis_System/visualization/skeleton_drawer.py
 *   - Force_Analysis_System/visualization/metric_overlay.py
 *   - Sports_Analysis_Force_line/project/output/skeleton_drawer.py
 *   - Sports_Analysis_Force_line/project/output/metric_overlay.py
 */

const Visualizer = (() => {
  // Color scheme
  const COLORS = {
    normal:        "#00e676", // green
    mild:          "#ffeb3b", // yellow
    moderate:      "#ff9800", // orange
    severe:        "#f44336", // red
    skeleton:      "rgba(66, 165, 245, 0.8)",  // blue
    joint:         "rgba(66, 165, 245, 1.0)",
    plumbLine:     "rgba(255, 255, 255, 0.5)",
    forceLine:     "rgba(0, 230, 118, 0.9)",
    forceLineWarn: "rgba(255, 152, 0, 0.9)",
    forceLineBad:  "rgba(244, 67, 54, 0.9)",
    textBg:        "rgba(0, 0, 0, 0.65)",
    panelBg:       "rgba(0, 0, 0, 0.75)"
  };

  // Bone connections for skeleton drawing
  const BONES = [
    // Torso
    ["left_shoulder", "right_shoulder"],
    ["left_shoulder", "left_hip"],
    ["right_shoulder", "right_hip"],
    ["left_hip", "right_hip"],
    // Left arm
    ["left_shoulder", "left_elbow"],
    ["left_elbow", "left_wrist"],
    // Right arm
    ["right_shoulder", "right_elbow"],
    ["right_elbow", "right_wrist"],
    // Left leg
    ["left_hip", "left_knee"],
    ["left_knee", "left_ankle"],
    ["left_ankle", "left_heel"],
    ["left_heel", "left_foot_index"],
    // Right leg
    ["right_hip", "right_knee"],
    ["right_knee", "right_ankle"],
    ["right_ankle", "right_heel"],
    ["right_heel", "right_foot_index"]
  ];

  // Key joints to draw as circles
  const KEY_JOINTS = [
    "nose", "left_ear", "right_ear",
    "left_shoulder", "right_shoulder",
    "left_elbow", "right_elbow",
    "left_wrist", "right_wrist",
    "left_hip", "right_hip",
    "left_knee", "right_knee",
    "left_ankle", "right_ankle",
    "left_heel", "right_heel",
    "left_foot_index", "right_foot_index"
  ];

  /**
   * Get severity color.
   */
  function severityColor(severity) {
    return COLORS[severity] || COLORS.normal;
  }

  /**
   * Get force line color based on grade.
   */
  function forceLineColor(grade) {
    if (grade === "A") return COLORS.forceLine;
    if (grade === "B") return COLORS.forceLineWarn;
    return COLORS.forceLineBad;
  }

  /**
   * Draw full skeleton overlay.
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} landmarks - named landmarks from PoseDetector
   * @param {number} w - canvas width
   * @param {number} h - canvas height
   */
  function drawSkeleton(ctx, landmarks, w, h) {
    if (!landmarks) return;

    // Draw bones
    ctx.strokeStyle = COLORS.skeleton;
    ctx.lineWidth = Math.max(2, w * 0.004);
    ctx.lineCap = "round";

    for (const [a, b] of BONES) {
      const p1 = landmarks[a];
      const p2 = landmarks[b];
      if (!p1 || !p2 || p1.visibility < 0.3 || p2.visibility < 0.3) continue;
      ctx.beginPath();
      ctx.moveTo(p1.x * w, p1.y * h);
      ctx.lineTo(p2.x * w, p2.y * h);
      ctx.stroke();
    }

    // Draw joints
    const jointRadius = Math.max(3, w * 0.008);
    for (const name of KEY_JOINTS) {
      const p = landmarks[name];
      if (!p || p.visibility < 0.3) continue;
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, jointRadius, 0, 2 * Math.PI);
      ctx.fillStyle = COLORS.joint;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  /**
   * Draw the plumb line and force line for sagittal view.
   */
  function drawForceLines(ctx, landmarks, assessment, view, w, h) {
    if (!landmarks) return;

    const shoulderMid = PoseDetector.midpoint(
      landmarks["left_shoulder"] || landmarks["right_shoulder"],
      landmarks["right_shoulder"] || landmarks["left_shoulder"]
    );
    const hipMid = PoseDetector.midpoint(
      landmarks["left_hip"] || { x: 0, y: 0 },
      landmarks["right_hip"] || { x: 0, y: 0 }
    );
    const ankleMid = PoseDetector.midpoint(
      landmarks["left_ankle"] || { x: 0, y: 0 },
      landmarks["right_ankle"] || { x: 0, y: 0 }
    );

    const grade = assessment ? assessment.force_line_grade : "A";
    const flColor = forceLineColor(grade);

    if (view === "sagittal") {
      // Use left side or visible side
      const ear = landmarks["left_ear"];
      const shoulder = landmarks["left_shoulder"];
      const hip = landmarks["left_hip"];
      const knee = landmarks["left_knee"];
      const ankle = landmarks["left_ankle"];

      // Plumb line (vertical reference from ankle)
      ctx.setLineDash([6, 8]);
      ctx.strokeStyle = COLORS.plumbLine;
      ctx.lineWidth = Math.max(1.5, w * 0.003);
      const plumbX = ankle ? ankle.x * w : ankleMid.x * w;
      ctx.beginPath();
      ctx.moveTo(plumbX, 0);
      ctx.lineTo(plumbX, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // Force line (ear -> shoulder -> hip -> knee -> ankle)
      if (ear && shoulder && hip && knee && ankle) {
        const points = [ear, shoulder, hip, knee, ankle].filter(p => p && p.visibility > 0.3);
        if (points.length >= 3) {
          ctx.strokeStyle = flColor;
          ctx.lineWidth = Math.max(3, w * 0.006);
          ctx.beginPath();
          ctx.moveTo(points[0].x * w, points[0].y * h);
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x * w, points[i].y * h);
          }
          ctx.stroke();
        }
      }
    } else {
      // Frontal: center line (shoulderMid -> hipMid -> ankleMid)
      ctx.setLineDash([6, 8]);
      ctx.strokeStyle = COLORS.plumbLine;
      ctx.lineWidth = Math.max(1.5, w * 0.003);
      const midX = (shoulderMid.x + hipMid.x + ankleMid.x) / 3 * w;
      ctx.beginPath();
      ctx.moveTo(midX, shoulderMid.y * h);
      ctx.lineTo(midX, ankleMid.y * h);
      ctx.stroke();
      ctx.setLineDash([]);

      // Force line
      ctx.strokeStyle = flColor;
      ctx.lineWidth = Math.max(3, w * 0.006);
      ctx.beginPath();
      ctx.moveTo(shoulderMid.x * w, shoulderMid.y * h);
      ctx.lineTo(hipMid.x * w, hipMid.y * h);
      ctx.lineTo(ankleMid.x * w, ankleMid.y * h);
      ctx.stroke();

      // Knee offsets
      const leftKnee = landmarks["left_knee"];
      const rightKnee = landmarks["right_knee"];
      if (leftKnee && rightKnee) {
        ctx.fillStyle = COLORS.moderate;
        ctx.beginPath();
        ctx.arc(leftKnee.x * w, leftKnee.y * h, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rightKnee.x * w, rightKnee.y * h, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }

  /**
   * Draw metric text overlay.
   */
  function drawMetrics(ctx, metricValues, assessment, view, w, h) {
    if (!metricValues || !assessment) return;

    const fontSize = Math.max(11, Math.min(14, w * 0.022));
    ctx.font = `${fontSize}px "SF Mono", "Cascadia Code", "Consolas", monospace`;
    ctx.textBaseline = "top";

    let y = 10;
    const x = 10;
    const lineHeight = fontSize + 4;

    // Draw header
    const headerBg = `${COLORS.textBg}`;
    ctx.fillStyle = headerBg;
    const headerW = w * 0.35;
    ctx.fillRect(x - 4, y - 4, headerW, lineHeight * 1.5 + 10);
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${fontSize + 1}px "SF Mono", "Cascadia Code", "Consolas", monospace`;
    const viewLabel = view === "sagittal" ? "矢状面" : "冠状面";
    ctx.fillText(`${viewLabel} | 评分: ${assessment.overall_score} | 力线: ${assessment.force_line_grade}`, x, y + 2);
    y += lineHeight * 1.5 + 8;
    ctx.font = `${fontSize}px "SF Mono", "Cascadia Code", "Consolas", monospace`;

    // Show top issues
    if (assessment.risk_flags.length > 0) {
      const topIssue = assessment.risk_flags.sort((a, b) => {
        const order = { severe: 3, moderate: 2, mild: 1 };
        return order[b.severity] - order[a.severity];
      }).slice(0, 3);

      for (const flag of topIssue) {
        const color = severityColor(flag.severity);
        const text = `${flag.label_zh}`;
        const tw = ctx.measureText(text).width;
        ctx.fillStyle = COLORS.textBg;
        ctx.fillRect(x - 2, y - 2, tw + 8, lineHeight + 2);
        ctx.fillStyle = color;
        ctx.fillText(text, x + 2, y);
        y += lineHeight + 2;
      }
    }

    // Show a few key metrics
    const keyMetrics = view === "sagittal"
      ? ["cva", "trunk_tilt_angle", "body_line_angle", "hip_angle", "knee_angle"]
      : ["head_tilt", "shoulder_height_diff", "trunk_tilt", "center_offset", "knee_angle_diff"];

    y += 4;
    for (const key of keyMetrics) {
      const m = assessment.metrics[key];
      if (!m) continue;
      const color = severityColor(m.severity);
      const valStr = typeof m.value === "number" ? m.value.toFixed(1) : m.value;
      const text = `${m.name_zh}: ${valStr}${m.unit}`;
      const tw = ctx.measureText(text).width;
      ctx.fillStyle = COLORS.textBg;
      ctx.fillRect(x - 2, y - 2, tw + 8, lineHeight + 2);
      ctx.fillStyle = color;
      ctx.fillText(text, x + 2, y);
      y += lineHeight + 2;
    }
  }

  /**
   * Main render function — draws everything on canvas.
   */
  function render(ctx, video, landmarks, metricValues, assessment, view, w, h) {
    ctx.clearRect(0, 0, w, h);

    // Mirror for front-facing camera
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);

    // Draw video frame
    if (video && video.readyState >= 2) {
      ctx.drawImage(video, 0, 0, w, h);
    }

    // Draw skeleton
    drawSkeleton(ctx, landmarks, w, h);

    // Draw force lines (always draw if landmarks available, use default grade if no assessment)
    drawForceLines(ctx, landmarks, assessment || { force_line_grade: "A" }, view, w, h);

    ctx.restore();

    // Draw metric overlay (not mirrored)
    if (metricValues && assessment) {
      drawMetrics(ctx, metricValues, assessment, view, w, h);
    }

    // Status indicator
    if (!landmarks) {
      ctx.fillStyle = COLORS.textBg;
      ctx.fillRect(w / 2 - 80, h / 2 - 20, 160, 40);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("未检测到人体", w / 2, h / 2);
      ctx.textAlign = "start";
    }
  }

  /**
   * Draw a mini force line diagram (for the report panel).
   */
  function drawMiniDiagram(ctx, assessment, x, y, width, height) {
    ctx.fillStyle = COLORS.panelBg;
    ctx.fillRect(x, y, width, height);

    const cx = x + width / 2;
    const grade = assessment.force_line_grade;
    const color = forceLineColor(grade);

    // Plumb line
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = COLORS.plumbLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, y + 10);
    ctx.lineTo(cx, y + height - 10);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw body force line deviation
    const deviation = assessment.force_line_grade === "A" ? 2 :
                      assessment.force_line_grade === "B" ? 8 :
                      assessment.force_line_grade === "C" ? 15 : 25;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, y + 15);
    ctx.lineTo(cx + deviation, y + height * 0.35);
    ctx.lineTo(cx - deviation * 0.5, y + height * 0.6);
    ctx.lineTo(cx, y + height - 10);
    ctx.stroke();

    // Label
    ctx.fillStyle = "#fff";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`力线等级: ${grade}`, cx, y + height - 2);
    ctx.textAlign = "start";
  }

  return {
    render,
    drawMiniDiagram,
    severityColor,
    forceLineColor,
    COLORS,
    BONES,
    KEY_JOINTS
  };
})();
