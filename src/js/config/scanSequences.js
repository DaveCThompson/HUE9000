import { HUE_ASSIGNMENT_ROW_HUES } from './ui.js';

export const scanSequences = {
  BTN1_SCAN: { // THINK
    mainTitle: "COGNITIVE & STRATEGIC ANALYSIS",
    scanTarget: "DAVID THOMPSON",
    conclusionMessage: "CONCLUSION: SUBJECT POSSESSES ROBUST STRATEGIC PLANNING CAPABILITIES.",
    subJobs: [
      {
        title: "Problem Decomposition",
        renderer: 'barFill',
        hue: HUE_ASSIGNMENT_ROW_HUES[4], // Blue
        progressiveLines: [
            { text: "PARSING COMPLEX REQUIREMENTS", duration: 1.3 },
            { text: "IDENTIFYING CORE CONSTRAINTS", duration: 1.1 },
            { text: "MAPPING USER-STORY VECTORS", duration: 1.6 }
        ]
      },
      {
        title: "Solution Ideation",
        renderer: 'typeWindow',
        hue: HUE_ASSIGNMENT_ROW_HUES[8], // Green
        progressiveLines: [
            { text: "GENERATING NOVEL PATHWAYS...", duration: 1.4 },
            { text: "EVALUATING HEURISTIC MODELS...", duration: 1.8 },
            { text: "OPTIMAL SOLUTION IDENTIFIED", duration: 1.2 }
        ]
      },
      {
        title: "Architectural Synthesis",
        renderer: 'barFill',
        hue: HUE_ASSIGNMENT_ROW_HUES[6], // Cyan
        progressiveLines: [
            { text: "ANALYZING STATE MANAGEMENT PATTERNS", duration: 1.5 },
            { text: "DEFINING DECOUPLED MODULES", duration: 1.4 }
        ]
      },
      {
        title: "Risk Assessment",
        renderer: 'typeWindow',
        hue: HUE_ASSIGNMENT_ROW_HUES[10], // Orange
        progressiveLines: [
            { text: "CALCULATING TECH DEBT...", duration: 1.1 },
            { text: "SIMULATING EDGE-CASE FAILURES...", duration: 1.9 },
            { text: "RISK PROFILE: LOW (MITIGATED)", duration: 1.3 }
        ]
      }
    ]
  },
  BTN2_SCAN: { // BUILD
    mainTitle: "EXECUTION & DELIVERY ANALYSIS",
    scanTarget: "DAVID THOMPSON",
    conclusionMessage: "CONCLUSION: SUBJECT IS A PROVEN AND EFFICIENT EXECUTION ENGINE.",
    subJobs: [
      {
        title: "Team Architecture",
        renderer: 'barFill',
        hue: HUE_ASSIGNMENT_ROW_HUES[5], // Sky Blue
        progressiveLines: [
            { text: "ANALYZING TEAM SCALING (5 -> 14)", duration: 1.4 },
            { text: "EVALUATING TALENT CULTIVATION", duration: 1.7 }
        ]
      },
      {
        title: "Development Lifecycle",
        renderer: 'typeWindow',
        hue: HUE_ASSIGNMENT_ROW_HUES[2], // Magenta
        progressiveLines: [
            { text: "AUDITING AGILE METHODOLOGIES...", duration: 1.5 },
            { text: "MEASURING VELOCITY & THROUGHPUT...", duration: 1.8 },
            { text: "LIFECYCLE EFFICIENCY: 94.3%", duration: 1.1 }
        ]
      },
      {
        title: "Cross-Functional Integration",
        renderer: 'barFill',
        hue: HUE_ASSIGNMENT_ROW_HUES[9], // Yellow
        progressiveLines: [
            { text: "MAPPING ENG/BIZ COMMUNICATION", duration: 1.6 },
            { text: "ALIGNMENT COEFFICIENT: HIGH", duration: 1.2 }
        ]
      },
      {
        title: "Deployment & Impact",
        renderer: 'typeWindow',
        hue: HUE_ASSIGNMENT_ROW_HUES[11], // Red
        progressiveLines: [
            { text: "ANALYZING 'ECOSTRUXURE' LAUNCH...", duration: 1.5 },
            { text: "CORRELATING +44% SALES GROWTH...", duration: 2.0 },
            { text: "IMPACT: SIGNIFICANT (VERIFIED)", duration: 1.4 }
        ]
      }
    ]
  },
  BTN3_SCAN: { // CRAFT
    mainTitle: "EVALUATING INDIVIDUAL CONTRIBUTOR FIT",
    scanTarget: "DAVID THOMPSON",
    conclusionMessage: "CONCLUSION: HIGHLY EFFECTIVE IN LEAD IC ROLE.",
    subJobs: [
      {
        title: "Expert-Level Craft",
        renderer: 'barFill',
        hue: HUE_ASSIGNMENT_ROW_HUES[8], // Green
        progressiveLines: [
            { text: "UX ARCHITECTURE", duration: 1.2 },
            { text: "HEURISTIC ANALYSIS", duration: 1.5 },
            { text: "DESIGN SYSTEMS", duration: 1.0 }
        ]
      },
      {
        title: "Innovation Matrix",
        renderer: 'typeWindow',
        hue: HUE_ASSIGNMENT_ROW_HUES[4], // Blue
        progressiveLines: [
            { text: "ANALYZING PATENT SUBMISSIONS...", duration: 1.2 },
            { text: "CROSS-REFERENCING R&D IMPACT...", duration: 1.4 },
            { text: "INNOVATION COEFFICIENT: 92.7%", duration: 1.0 }
        ]
      },
      {
        title: "Design Leadership",
        renderer: 'barFill',
        hue: HUE_ASSIGNMENT_ROW_HUES[9], // Yellow
        progressiveLines: [
            { text: "MENTORSHIP PROTOCOLS", duration: 1.1 },
            { text: "KNOWLEDGE TRANSFER EFFICIENCY", duration: 1.6 }
        ]
      },
      {
        title: "Technical Proficiency",
        renderer: 'typeWindow',
        hue: HUE_ASSIGNMENT_ROW_HUES[6], // Cyan
        progressiveLines: [
            { text: "VERIFYING CREDENTIALS: B.ENG...", duration: 1.0 },
            { text: "ASSESSING STATE MGMT PATTERNS...", duration: 1.5 },
            { text: "PROFICIENCY: EXPERT (VERIFIED)", duration: 1.2 }
        ]
      }
    ]
  },
  BTN4_SCAN: { // LEAD
    mainTitle: "EVALUATING COMMAND-LEVEL FIT",
    scanTarget: "DAVID THOMPSON",
    conclusionMessage: "CONCLUSION: OPTIMIZED FOR TEAM BUILDING & STRATEGIC COMMAND.",
    subJobs: [
        {
            title: "Team Construction",
            renderer: 'barFill',
            hue: HUE_ASSIGNMENT_ROW_HUES[10], // Orange
            progressiveLines: [
                { text: "RECRUITMENT PIPELINE ANALYSIS", duration: 1.5 },
                { text: "TEAM GROWTH METRICS (5 -> 14)", duration: 1.2 }
            ]
        },
        {
            title: "Talent Development",
            renderer: 'typeWindow',
            hue: HUE_ASSIGNMENT_ROW_HUES[5], // Sky Blue
            progressiveLines: [
                { text: "SIMULATING MENTORSHIP OUTCOMES...", duration: 1.4 },
                { text: "AGGREGATING PERFORMANCE DATA...", duration: 1.9 },
                { text: "LEADERSHIP POTENTIAL: HIGH", duration: 1.1 }
            ]
        },
        {
            title: "Strategic Alignment",
            renderer: 'barFill',
            hue: HUE_ASSIGNMENT_ROW_HUES[3], // Purple -- CORRECTED TYPO
            progressiveLines: [
                { text: "OKR ACHIEVEMENT AUDIT", duration: 1.6 },
                { text: "X-FUNCTIONAL COLLABORATION", duration: 1.3 }
            ]
        },
        {
            title: "Executive Training",
            renderer: 'typeWindow',
            hue: HUE_ASSIGNMENT_ROW_HUES[2], // Magenta
            progressiveLines: [
                { text: "INSEAD CERTIFICATION (VERIFIED)", duration: 1.2 },
                { text: "LEADERSHIP FRAMEWORK ANALYSIS...", duration: 2.0 },
                { text: "COMMAND READINESS: 98.2%", duration: 1.3 }
            ]
        }
    ]
  }
};