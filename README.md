# 体态评估系统 (Posture Assessment System)

基于 MediaPipe + 力线分析的 H5 静态体态评估网页。通过摄像头实时捕捉人体姿态，进行 21 项体态参数分析，支持本地 LLM 生成评估报告。

## 快速开始

### 1. 启动静态服务器

由于浏览器安全策略（Camera + ES Modules 需要 HTTP），需要本地服务器：

```bash
cd posture-assessment
python -m http.server 8000
# 或: npx serve .
```

然后打开浏览器访问 `http://localhost:8000`

### 2. 基本使用

1. 允许摄像头权限
2. 侧身站立（侧面观），或面向摄像头（正面观）
3. 点击"拍照评估"或按**空格键**捕获
4. 查看评估报告和力线等级

### 3. AI 报告生成 (可选)

安装并运行 Ollama:

```bash
# 安装: https://ollama.com
ollama pull qwen2.5:3b
ollama serve
```

然后在页面设置中确认地址为 `http://localhost:11434/api/generate`，点击"AI 生成详细报告"。

## 评估指标

### 侧面观（矢状面）— 12 项
- 颅颈角 (CVA)、颈部前移量、颈部屈曲角
- 肩部前伸角、躯干前倾角
- 髋关节角、骨盆倾斜度、身体力线角
- 腰椎前凸间隙、铅垂线偏移
- 膝关节角、踝关节角

### 正面观（冠状面）— 9 项
- 头侧倾角、高低肩差异、躯干侧倾
- 骨盆侧倾、身体中线偏移
- 左右膝偏移（内外翻）、双膝角差异、踝关节对称性

## 参考来源

- Ludwig O. (2025) Posture Analysis in the Sagittal Plane. *Anatomia*, 4(2):5
- Nawal et al. (2025) Screening of FHP Through CVA Measurement. *JHWCR*
- Yip CH et al. (2008) *J Manipulative Physiol Ther*, 31(5):388-393
- Ruivo RM et al. (2015) *J Manipulative Physiol Ther*, 38(1):74-80
- Thigpen CA et al. (2010) *J Electromyogr Kinesiol*, 20(4):701-709
- Akel I et al. (2008) *Eur Spine J*, 17(9):1203-1207
