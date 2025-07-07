import { HUE_ASSIGNMENT_ROW_HUES } from './ui.js';

export const scanSequences = {
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