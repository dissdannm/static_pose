/**
 * Posture Rules Engine — Literature-based thresholds for 21 postural metrics.
 * References: Ludwig 2025, Nawal 2025, Yip 2008, Ruivo 2015, Thigpen 2010,
 *   Akel 2008, Force_Analysis_System, Sports_Analysis_Force_line
 */

// ─── Metric Catalog ───────────────────────────────────────────────────────────
const POSTURE_METRICS = {

  // ═══ Sagittal View (Side View / 矢状面) ═══

  cva: {
    name_zh: "颅颈角 (CVA)",
    name_en: "Craniovertebral Angle",
    category: "head_neck",
    unit: "deg",
    view: "sagittal",
    description: "耳-肩连线与垂直线的夹角，反映头前倾程度",
    normal: [50, 70],
    severity: {
      mild:    { range: [40, 50], label_zh: "轻度头前倾", label_en: "Mild FHP" },
      moderate:{ range: [30, 40], label_zh: "中度头前倾", label_en: "Moderate FHP" },
      severe:  { range: [0, 30],  label_zh: "重度头前倾", label_en: "Severe FHP" }
    },
    ref: "Nawal 2025; Yip 2008"
  },

  neck_forward_offset: {
    name_zh: "颈部前移量",
    name_en: "Neck Forward Offset",
    category: "head_neck",
    unit: "norm",
    view: "sagittal",
    description: "鼻尖相对于肩部中点的水平偏移量（归一化坐标）",
    normal: [-0.03, 0.04],
    severity: {
      mild:    { range: [0.04, 0.06], label_zh: "颈部轻度前移" },
      moderate:{ range: [0.06, 0.08], label_zh: "颈部中度前移" },
      severe:  { range: [0.08, 1.0],  label_zh: "颈部重度前移" }
    },
    ref: "Sports_Analysis_Force_line"
  },

  shoulder_angle: {
    name_zh: "肩部前伸角",
    name_en: "Shoulder Forward Angle",
    category: "shoulders_upper_back",
    unit: "deg",
    view: "sagittal",
    description: "耳-肩连线与垂直线的夹角，0°=理想，越大=越圆肩",
    normal: [0, 8],
    severity: {
      mild:    { range: [8, 15],  label_zh: "轻度圆肩" },
      moderate:{ range: [15, 25], label_zh: "中度圆肩" },
      severe:  { range: [25, 90], label_zh: "重度圆肩" }
    },
    ref: "Ruivo 2015; Thigpen 2010 (adapted for 2D)"
  },

  trunk_tilt_angle: {
    name_zh: "躯干前倾角",
    name_en: "Trunk Inclination Angle",
    category: "shoulders_upper_back",
    unit: "deg",
    view: "sagittal",
    description: "躯干线（肩中点→髋中点）与垂线的夹角，反映驼背/胸椎后凸",
    normal: [0, 5],
    severity: {
      mild:    { range: [5, 10],  label_zh: "轻度躯干前倾" },
      moderate:{ range: [10, 15], label_zh: "中度躯干前倾/驼背" },
      severe:  { range: [15, 90], label_zh: "重度驼背" }
    },
    ref: "Ludwig 2025; Koelen 2020"
  },

  hip_angle: {
    name_zh: "髋关节角",
    name_en: "Hip Angle (Standing)",
    category: "pelvis_core",
    unit: "deg",
    view: "sagittal",
    description: "肩-髋-膝三点夹角，反映骨盆前/后倾",
    normal: [160, 180],
    severity: {
      mild:    { range: [150, 160], label_zh: "轻度骨盆前倾" },
      moderate:{ range: [135, 150], label_zh: "中度骨盆前倾" },
      severe:  { range: [0, 135],   label_zh: "重度骨盆前倾" }
    },
    ref: "Sports_Analysis_Force_line; Ludwig 2025"
  },

  knee_angle: {
    name_zh: "膝关节角",
    name_en: "Knee Angle (Standing)",
    category: "lower_limbs",
    unit: "deg",
    view: "sagittal",
    description: "髋-膝-踝三点夹角，>180表示膝超伸",
    normal: [170, 180],
    severity: {
      mild:    { range: [165, 170], label_zh: "轻度膝屈曲" },
      moderate:{ range: [155, 165], label_zh: "中度膝屈曲" },
      severe:  { range: [0, 155],   label_zh: "重度膝屈曲" }
    },
    // Knee hyperextension: > 180 deg
    hyperextension: true,
    hyper_normal: [180, 185],
    hyper_mild:    [185, 190],
    hyper_moderate:[190, 195],
    hyper_severe:  [195, 220],
    ref: "Physio-pedia; JOSPT 1998"
  },

  ankle_angle: {
    name_zh: "踝关节角",
    name_en: "Ankle Angle",
    category: "lower_limbs",
    unit: "deg",
    view: "sagittal",
    description: "膝-踝-足尖三点夹角",
    normal: [85, 95],
    severity: {
      mild:    { range: [[75, 85], [95, 100]], label_zh: "轻度踝关节异常" },
      moderate:{ range: [[65, 75], [100, 110]], label_zh: "中度踝关节异常" },
      severe:  { range: [[0, 65], [110, 180]], label_zh: "重度踝关节异常" }
    },
    ref: "General biomechanics"
  },

  body_line_angle: {
    name_zh: "身体力线角",
    name_en: "Body Force Line Angle",
    category: "pelvis_core",
    unit: "deg",
    view: "sagittal",
    description: "肩中点→髋中点→踝中点三点夹角，理想为180°（直线）",
    normal: [175, 180],
    severity: {
      mild:    { range: [170, 175], label_zh: "力线轻度偏移" },
      moderate:{ range: [160, 170], label_zh: "力线中度偏移" },
      severe:  { range: [0, 160],   label_zh: "力线严重偏移" }
    },
    ref: "Sports_Analysis_Force_line"
  },

  neck_flexion_angle: {
    name_zh: "颈部屈曲角",
    name_en: "Neck Flexion Angle",
    category: "head_neck",
    unit: "deg",
    view: "sagittal",
    description: "鼻尖-肩中点-髋中点夹角，反映颈部代偿屈曲",
    normal: [0, 20],
    severity: {
      mild:    { range: [20, 25], label_zh: "轻度颈部代偿" },
      moderate:{ range: [25, 35], label_zh: "中度颈部代偿" },
      severe:  { range: [35, 90], label_zh: "重度颈部代偿" }
    },
    ref: "Sports_Analysis_Force_line"
  },

  lumbar_gap: {
    name_zh: "腰椎前凸间隙",
    name_en: "Lumbar Gap Distance",
    category: "pelvis_core",
    unit: "norm",
    view: "sagittal",
    description: "躯干线中点与髋部的垂直间隙，近似腰椎前凸程度",
    normal: [0, 0.03],
    severity: {
      mild:    { range: [0.03, 0.05], label_zh: "腰椎前凸轻度增大" },
      moderate:{ range: [0.05, 0.08], label_zh: "腰椎前凸中度增大" },
      severe:  { range: [0.08, 1.0],  label_zh: "腰椎前凸过度" }
    },
    ref: "Sports_Analysis_Force_line; Troyanovich 1997"
  },

  plumb_line_deviation: {
    name_zh: "铅垂线偏移",
    name_en: "Plumb Line Deviation",
    category: "pelvis_core",
    unit: "norm",
    view: "sagittal",
    description: "耳-肩-髋-膝-踝与理想铅垂线的综合偏移量",
    normal: [0, 0.03],
    severity: {
      mild:    { range: [0.03, 0.06], label_zh: "体态轻度偏移" },
      moderate:{ range: [0.06, 0.10], label_zh: "体态中度偏移" },
      severe:  { range: [0.10, 1.0],  label_zh: "体态显著偏移" }
    },
    ref: "Ludwig 2025"
  },

  pelvic_tilt: {
    name_zh: "骨盆倾斜度",
    name_en: "Pelvic Tilt (Sagittal)",
    category: "pelvis_core",
    unit: "norm",
    view: "sagittal",
    description: "肩-髋连线与垂线的偏差（矢状面骨盆倾斜近似）",
    normal: [-0.02, 0.02],
    severity: {
      mild:    { range: [0.02, 0.04], label_zh: "骨盆轻度倾斜" },
      moderate:{ range: [0.04, 0.07], label_zh: "骨盆中度倾斜" },
      severe:  { range: [0.07, 1.0],  label_zh: "骨盆严重倾斜" }
    },
    ref: "Sports_Analysis_Force_line"
  },

  // ═══ Frontal View (Front View / 冠状面) ═══

  head_tilt: {
    name_zh: "头侧倾角",
    name_en: "Head Tilt Angle",
    category: "head_neck",
    unit: "deg",
    view: "frontal",
    description: "双耳连线与水平面的夹角",
    normal: [0, 3],
    severity: {
      mild:    { range: [3, 7],   label_zh: "轻度头侧倾" },
      moderate:{ range: [7, 12],  label_zh: "中度头侧倾" },
      severe:  { range: [12, 45], label_zh: "重度头侧倾" }
    },
    ref: "Clinical postural assessment"
  },

  shoulder_height_diff: {
    name_zh: "高低肩差异",
    name_en: "Shoulder Height Difference",
    category: "shoulders_upper_back",
    unit: "norm",
    view: "frontal",
    description: "左右肩Y坐标差值（归一化），反映高低肩",
    normal: [0, 0.02],
    severity: {
      mild:    { range: [0.02, 0.04], label_zh: "轻度高低肩" },
      moderate:{ range: [0.04, 0.07], label_zh: "中度高低肩" },
      severe:  { range: [0.07, 1.0],  label_zh: "重度高低肩" }
    },
    ref: "Akel 2008 (RSH > 10mm equivalent)"
  },

  trunk_tilt: {
    name_zh: "躯干侧倾",
    name_en: "Trunk Lateral Lean",
    category: "shoulders_upper_back",
    unit: "norm",
    view: "frontal",
    description: "肩中点与髋中点水平偏移（归一化），反映脊柱侧弯风险",
    normal: [0, 0.05],
    severity: {
      mild:    { range: [0.05, 0.10], label_zh: "躯干轻度侧倾" },
      moderate:{ range: [0.10, 0.15], label_zh: "躯干中度侧倾" },
      severe:  { range: [0.15, 1.0],  label_zh: "躯干显著侧倾※" }
    },
    ref: "Force_Analysis_System"
  },

  pelvis_tilt: {
    name_zh: "骨盆侧倾",
    name_en: "Pelvic Obliquity",
    category: "pelvis_core",
    unit: "norm",
    view: "frontal",
    description: "左右髋Y坐标差值（归一化），反映骨盆侧倾",
    normal: [0, 0.03],
    severity: {
      mild:    { range: [0.03, 0.06], label_zh: "骨盆轻度侧倾" },
      moderate:{ range: [0.06, 0.10], label_zh: "骨盆中度侧倾" },
      severe:  { range: [0.10, 1.0],  label_zh: "骨盆显著侧倾※" }
    },
    ref: "Literature; scoliosis screening"
  },

  center_offset: {
    name_zh: "身体中线偏移",
    name_en: "Body Center Offset",
    category: "pelvis_core",
    unit: "norm",
    view: "frontal",
    description: "髋中点相对踝中点的水平偏移量",
    normal: [0, 0.03],
    severity: {
      mild:    { range: [0.03, 0.05], label_zh: "中线轻度偏移" },
      moderate:{ range: [0.05, 0.08], label_zh: "中线中度偏移" },
      severe:  { range: [0.08, 1.0],  label_zh: "中线显著偏移" }
    },
    ref: "Force_Analysis_System"
  },

  knee_offset_left: {
    name_zh: "左膝偏移（内外翻）",
    name_en: "Left Knee Valgus/Varus",
    category: "lower_limbs",
    unit: "norm",
    view: "frontal",
    description: "左膝相对髋-踝连线的侧向偏移",
    normal: [-0.02, 0.02],
    severity: {
      mild:    { range: [0.02, 0.04], label_zh: "左膝轻度偏移" },
      moderate:{ range: [0.04, 0.07], label_zh: "左膝中度偏移" },
      severe:  { range: [0.07, 1.0],  label_zh: "左膝显著偏移" }
    },
    ref: "Force_Analysis_System"
  },

  knee_offset_right: {
    name_zh: "右膝偏移（内外翻）",
    name_en: "Right Knee Valgus/Varus",
    category: "lower_limbs",
    unit: "norm",
    view: "frontal",
    description: "右膝相对髋-踝连线的侧向偏移",
    normal: [-0.02, 0.02],
    severity: {
      mild:    { range: [0.02, 0.04], label_zh: "右膝轻度偏移" },
      moderate:{ range: [0.04, 0.07], label_zh: "右膝中度偏移" },
      severe:  { range: [0.07, 1.0],  label_zh: "右膝显著偏移" }
    },
    ref: "Force_Analysis_System"
  },

  knee_angle_diff: {
    name_zh: "双膝角差异",
    name_en: "Knee Angle Symmetry",
    category: "lower_limbs",
    unit: "deg",
    view: "frontal",
    description: "左右膝关节角度之差的绝对值",
    normal: [0, 5],
    severity: {
      mild:    { range: [5, 10],  label_zh: "双膝轻度不对称" },
      moderate:{ range: [10, 15], label_zh: "双膝中度不对称" },
      severe:  { range: [15, 180],label_zh: "双膝显著不对称" }
    },
    ref: "Force_Analysis_System"
  },

  ankle_symmetry: {
    name_zh: "踝关节对称性",
    name_en: "Ankle Alignment Symmetry",
    category: "lower_limbs",
    unit: "norm",
    view: "frontal",
    description: "左右踝高度差异（归一化）",
    normal: [0, 0.02],
    severity: {
      mild:    { range: [0.02, 0.04], label_zh: "踝部轻度不对称" },
      moderate:{ range: [0.04, 0.07], label_zh: "踝部中度不对称" },
      severe:  { range: [0.07, 1.0],  label_zh: "踝部显著不对称" }
    },
    ref: "General biomechanics"
  }
};

// ─── Region Definitions ────────────────────────────────────────────────────────
const POSTURE_REGIONS = {
  head_neck: {
    name_zh: "头颈部",
    name_en: "Head & Neck",
    weight: 0.20,
    metrics: ["cva", "neck_forward_offset", "neck_flexion_angle", "head_tilt"]
  },
  shoulders_upper_back: {
    name_zh: "肩与上背",
    name_en: "Shoulders & Upper Back",
    weight: 0.25,
    metrics: ["shoulder_angle", "trunk_tilt_angle", "shoulder_height_diff", "trunk_tilt"]
  },
  pelvis_core: {
    name_zh: "骨盆与核心",
    name_en: "Pelvis & Core",
    weight: 0.30,
    metrics: ["hip_angle", "body_line_angle", "lumbar_gap", "pelvic_tilt", "pelvis_tilt", "center_offset", "plumb_line_deviation"]
  },
  lower_limbs: {
    name_zh: "下肢力线",
    name_en: "Lower Limbs",
    weight: 0.25,
    metrics: ["knee_angle", "ankle_angle", "knee_offset_left", "knee_offset_right", "knee_angle_diff", "ankle_symmetry"]
  }
};

// ─── Rule Engine ───────────────────────────────────────────────────────────────

/**
 * Evaluate a single metric value and return severity.
 * @param {string} metricKey - e.g. "cva"
 * @param {number} value - current measurement
 * @returns {{ severity: string, label_zh: string, label_en: string, score: number }}
 *   severity: "normal" | "mild" | "moderate" | "severe"
 *   score: 100=normal, 70=mild, 40=moderate, 0=severe
 */
function evaluateMetric(metricKey, value) {
  const metric = POSTURE_METRICS[metricKey];
  if (!metric) return { severity: "normal", label_zh: "未知", label_en: "unknown", score: 100 };

  // Check hyperextension first (knee only)
  if (metric.hyperextension && value > metric.normal[1]) {
    if (value < metric.hyper_mild[1])    return { severity: "normal", label_zh: "正常", label_en: "Normal", score: 100 };
    if (value < metric.hyper_moderate[1]) return { severity: "mild", label_zh: "轻度膝超伸", label_en: "Mild Genu Recurvatum", score: 70 };
    if (value < metric.hyper_severe[1])  return { severity: "moderate", label_zh: "中度膝超伸", label_en: "Moderate Genu Recurvatum", score: 40 };
    return { severity: "severe", label_zh: "重度膝超伸", label_en: "Severe Genu Recurvatum", score: 0 };
  }

  // Check normal range
  if (value >= metric.normal[0] && value <= metric.normal[1]) {
    return { severity: "normal", label_zh: "正常", label_en: "Normal", score: 100 };
  }

  // Check severity tiers (severe first since upper range is inclusive)
  const absVal = Math.abs(value);
  const tiers = ["severe", "moderate", "mild"];
  for (const tier of tiers) {
    const rule = metric.severity[tier];
    if (!rule) continue;
    // Handle multi-range (e.g. ankle: [[75,85], [95,100]])
    const ranges = Array.isArray(rule.range[0]) ? rule.range : [rule.range];
    for (const r of ranges) {
      if (absVal >= r[0] && absVal <= r[1]) {
        const score = tier === "mild" ? 70 : tier === "moderate" ? 40 : 0;
        return { severity: tier, label_zh: rule.label_zh, label_en: rule.label_en, score };
      }
    }
  }

  return { severity: "normal", label_zh: "正常", label_en: "Normal", score: 100 };
}

/**
 * Evaluate all metrics for a given view.
 * @param {object} metricValues - { cva: 44.2, neck_forward_offset: 0.06, ... }
 * @param {string} view - "sagittal" | "frontal"
 * @returns {object} full assessment result
 */
function evaluateAllMetrics(metricValues, view) {
  const results = {};
  const riskFlags = [];
  let totalScore = 0;
  let count = 0;

  for (const [key, value] of Object.entries(metricValues)) {
    const metric = POSTURE_METRICS[key];
    if (!metric) continue;
    if (metric.view !== view && metric.view !== "both") continue;

    const evalResult = evaluateMetric(key, value);
    results[key] = {
      value: value,
      severity: evalResult.severity,
      label_zh: evalResult.label_zh,
      label_en: evalResult.label_en,
      score: evalResult.score,
      normal_range: metric.normal,
      unit: metric.unit,
      name_zh: metric.name_zh,
      category: metric.category
    };

    totalScore += evalResult.score;
    count++;

    if (evalResult.severity !== "normal") {
      riskFlags.push({
        metric: key,
        severity: evalResult.severity,
        label_zh: evalResult.label_zh,
        name_zh: metric.name_zh
      });
    }
  }

  // Calculate overall score
  const overallScore = count > 0 ? Math.round(totalScore / count) : 100;

  // Calculate risk level
  const severeCount = riskFlags.filter(f => f.severity === "severe").length;
  const moderateCount = riskFlags.filter(f => f.severity === "moderate").length;
  const mildCount = riskFlags.filter(f => f.severity === "mild").length;
  const riskScore = severeCount * 3 + moderateCount * 2 + mildCount * 1;

  let riskLevel = "low";
  if (riskScore >= 6) riskLevel = "high";
  else if (riskScore >= 3) riskLevel = "medium";

  // Region scores
  const regions = {};
  for (const [regionKey, region] of Object.entries(POSTURE_REGIONS)) {
    let regionScore = 0;
    let regionCount = 0;
    let primaryIssue = null;

    for (const mKey of region.metrics) {
      if (results[mKey]) {
        regionScore += results[mKey].score;
        regionCount++;
        if (results[mKey].severity !== "normal" && !primaryIssue && results[mKey].label_en) {
          primaryIssue = String(results[mKey].label_en).toLowerCase().replace(/\s+/g, "_");
        }
      }
    }
    regions[regionKey] = {
      score: regionCount > 0 ? Math.round(regionScore / regionCount) : 100,
      primary_issue: primaryIssue,
      name_zh: region.name_zh
    };
  }

  // Force line grade (A/B/C/D)
  let forceLineGrade = "A";
  const bodyLine = results["body_line_angle"] ? results["body_line_angle"].score : 100;
  const plumbLine = results["plumb_line_deviation"] ? results["plumb_line_deviation"].score : 100;
  const centerOff = results["center_offset"] ? results["center_offset"].score : 100;
  const flScore = (bodyLine * 0.4 + plumbLine * 0.3 + centerOff * 0.3);
  if (flScore < 40) forceLineGrade = "D";
  else if (flScore < 60) forceLineGrade = "C";
  else if (flScore < 80) forceLineGrade = "B";

  return {
    overall_score: overallScore,
    risk_level: riskLevel,
    risk_score: riskScore,
    force_line_grade: forceLineGrade,
    metrics: results,
    regions: regions,
    risk_flags: riskFlags,
    metrics_count: count
  };
}

// LLM prompt template
function buildLLMPrompt(assessmentResult, view) {
  const viewLabel = view === "sagittal" ? "侧面（矢状面）" : "正面（冠状面）";
  const flags = assessmentResult.risk_flags.map(f => `- ${f.name_zh}: ${f.label_zh}`).join("\n");
  const metricsSummary = Object.entries(assessmentResult.metrics)
    .map(([k, v]) => `- ${v.name_zh}(${k}): ${v.value?.toFixed?.(1) ?? v.value} ${v.unit} [${v.severity}]`)
    .join("\n");

  return `你是一位专业的运动康复与体态评估专家。请根据以下2D视觉体态评估数据，生成一份中文的体态评估报告。

## 评估信息
- 视角：${viewLabel}
- 综合评分：${assessmentResult.overall_score}/100
- 风险等级：${assessmentResult.risk_level}
- 力线等级：${assessmentResult.force_line_grade}

## 各区域评分
${Object.entries(assessmentResult.regions).map(([k, v]) => `- ${v.name_zh}: ${v.score}/100 ${v.primary_issue ? "(主要问题: " + v.primary_issue + ")" : "(正常)"}`).join("\n")}

## 详细指标
${metricsSummary}

## 发现的问题
${flags || "无明显体态问题"}

请生成包含以下内容的报告（使用中文，500字以内）：
1. 总体评估（1-2句总结）
2. 主要体态问题分析（按严重程度排序，每项说明临床意义）
3. 力线分析评价
4. 针对性的矫正训练建议（3-5个具体动作）
5. 日常生活姿势改善建议

请使用专业但通俗易懂的语言，适合普通用户阅读。`;
}

/**
 * Generate a Markdown report file for download.
 * Includes deviations from normal, severity, and literature references.
 */
function generateMarkdownReport(assessment, view) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("zh-CN") + " " + now.toLocaleTimeString("zh-CN");
  const viewLabel = view === "sagittal" ? "侧面观（矢状面）" : "正面观（冠状面）";
  const riskLabel = { low: "低", medium: "中", high: "高" };
  const severityIcon = { normal: "✓", mild: "△", moderate: "▲", severe: "●" };
  const severityLabel = { normal: "正常", mild: "轻度异常", moderate: "中度异常", severe: "重度异常" };

  let md = "";
  md += `# 体态评估报告\n\n`;
  md += `> **使用方式**：将本文档全文复制，发送给任意 AI（ChatGPT、DeepSeek、通义千问、Kimi 等），\n`;
  md += `> AI 将自动读取下方体态数据并生成个性化的分析报告与矫正建议。\n\n`;
  md += `---\n\n`;
  md += `## AI 提示词（Prompt）\n\n`;
  md += `你是一位资深运动康复与体态矫正专家，持有物理治疗博士学位，拥有 15 年临床经验。\n\n`;
  md += `请根据下方的 2D 视觉体态评估数据，完成以下任务：\n\n`;
  md += `1. **总体评估**（2-3 句）：概括受试者的整体体态状况，指出最突出的问题。\n`;
  md += `2. **逐项分析**：按头颈部→肩与上背→骨盆与核心→下肢力线的顺序，逐个分析异常指标，\n`;
  md += `   解释其临床意义（为什么这个指标重要）、可能的风险（不矫正会导致什么）。\n`;
  md += `3. **力线评价**：基于力线等级和身体力线角，评价整体生物力学对位情况。\n`;
  md += `4. **矫正方案**：为每个异常指标提供 1-2 个具体、可操作的矫正训练动作，\n`;
  md += `   包含动作名称、要领、建议频率（组数×次数）。\n`;
  md += `5. **日常建议**：提供 3-5 条日常生活姿势改善建议（办公、站立、行走等场景）。\n\n`;
  md += `分析要求：\n`;
  md += `- 语言通俗易懂，适合普通用户阅读\n`;
  md += `- 专业术语需附带简要解释\n`;
  md += `- 纠正建议需安全、可居家执行、无需特殊器械\n`;
  md += `- 标注哪些问题需要寻求专业医师进一步评估\n\n`;
  md += `---\n\n`;
  md += `## 基本信息\n\n`;
  md += `| 项目 | 内容 |\n|------|------|\n`;
  md += `| 评估日期 | ${dateStr} |\n`;
  md += `| 评估视角 | ${viewLabel} |\n`;
  md += `| 综合评分 | **${assessment.overall_score}/100** |\n`;
  md += `| 风险等级 | ${riskLabel[assessment.risk_level] || assessment.risk_level} |\n`;
  md += `| 力线等级 | ${assessment.force_line_grade} |\n`;
  md += `\n---\n\n`;

  // Region summary
  md += `## 区域评分\n\n`;
  md += `| 区域 | 评分 | 主要问题 |\n|------|------|----------|\n`;
  for (const [key, region] of Object.entries(assessment.regions)) {
    const issue = region.primary_issue ? region.primary_issue.replace(/_/g, " ") : "无";
    md += `| ${region.name_zh} | ${region.score}/100 | ${issue} |\n`;
  }
  md += `\n---\n\n`;

  // Detailed metrics by category
  const categories = {
    head_neck: "## 头颈部指标",
    shoulders_upper_back: "## 肩与上背指标",
    pelvis_core: "## 骨盆与核心指标",
    lower_limbs: "## 下肢力线指标"
  };

  for (const [catKey, catTitle] of Object.entries(categories)) {
    const catMetrics = Object.entries(assessment.metrics)
      .filter(([, m]) => m.category === catKey);

    if (catMetrics.length === 0) continue;

    md += catTitle + "\n\n";
    md += `| 指标 | 测量值 | 正常范围 | 偏移量 | 等级 |\n`;
    md += `|------|--------|----------|--------|------|\n`;

    for (const [key, m] of catMetrics) {
      const metricDef = POSTURE_METRICS[key];
      const normalStr = metricDef ? `${metricDef.normal[0]}–${metricDef.normal[1]}` : "—";
      let deviation = "—";

      if (metricDef && typeof m.value === "number") {
        if (m.value < metricDef.normal[0]) {
          deviation = `↓ ${(metricDef.normal[0] - m.value).toFixed(1)}`;
        } else if (m.value > metricDef.normal[1]) {
          deviation = `↑ ${(m.value - metricDef.normal[1]).toFixed(1)}`;
        } else {
          deviation = "正常范围内";
        }
      }

      const icon = severityIcon[m.severity] || "";
      md += `| ${icon} ${m.name_zh} | ${m.value?.toFixed?.(1) ?? m.value} ${m.unit} | ${normalStr} ${m.unit} | ${deviation} | ${severityLabel[m.severity] || m.severity} |\n`;
    }
    md += `\n`;
  }

  // Issues found
  md += `---\n\n## 发现的问题\n\n`;
  if (assessment.risk_flags.length === 0) {
    md += `未发现明显体态问题，各项指标在正常范围内。\n\n`;
  } else {
    // Sort by severity
    const sorted = [...assessment.risk_flags].sort((a, b) => {
      const order = { severe: 3, moderate: 2, mild: 1 };
      return order[b.severity] - order[a.severity];
    });
    for (const flag of sorted) {
      const icon = severityIcon[flag.severity];
      md += `- ${icon} **${flag.name_zh}** — ${flag.label_zh}\n`;
    }
    md += `\n`;
  }

  // References
  md += `---\n\n## 参考文献\n\n`;
  md += `以下阈值标准来源于同行评审的学术文献：\n\n`;

  const refs = new Set();
  for (const key of Object.keys(assessment.metrics)) {
    const m = POSTURE_METRICS[key];
    if (m && m.ref) refs.add(m.ref);
  }
  let refNum = 1;
  for (const ref of refs) {
    const sources = ref.split(";");
    for (const src of sources) {
      md += `${refNum}. ${src.trim()}\n`;
      refNum++;
    }
  }

  md += `\n> 注意：本报告基于 2D 摄像头（MediaPipe Pose Landmarker）采集数据，\n`;
  md += `> 测量结果为临床近似值，不能替代专业医学诊断。如有疑虑请咨询医生或物理治疗师。\n`;

  return md;
}

/**
 * Strip AI prompt section from markdown, leaving human-readable content only.
 */
function stripAIPromptFromMD(md) {
  const promptStart = md.indexOf("> **使用方式**");
  const dataStart = md.indexOf("## 基本信息");
  if (promptStart !== -1 && dataStart !== -1) {
    return "# 体态评估报告\n\n" + md.substring(dataStart);
  }
  return md;
}

// Export for module use (also available as globals)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { POSTURE_METRICS, POSTURE_REGIONS, evaluateMetric, evaluateAllMetrics, buildLLMPrompt, generateMarkdownReport };
}
