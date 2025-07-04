import { HUE_ASSIGNMENT_ROW_HUES } from './ui.js';

export const scanSequences = {
  BTN3_SCAN: { // CRAFT
    mainTitle: "EVALUATING INDIVIDUAL CONTRIBUTOR FIT",
    scanTarget: "DAVID THOMPSON",
    conclusionMessage: "CONCLUSION: HIGHLY EFFECTIVE IN LEAD IC ROLE.",
    subJobs: [
      {
        title: "Expert-Level Craft",
        hue: HUE_ASSIGNMENT_ROW_HUES[8], // Green
        timings: { introDelayMs: 200, outroDelayMs: 300 },
        progressiveLines: [
            { text: "UX ARCHITECTURE", duration: 1.2 },
            { text: "HEURISTIC ANALYSIS", duration: 1.5 },
            { text: "DESIGN SYSTEMS", duration: 1.0 }
        ]
      },
      {
        title: "Innovation Matrix",
        hue: HUE_ASSIGNMENT_ROW_HUES[4], // Blue
        timings: { introDelayMs: 200, outroDelayMs: 300 },
        progressiveLines: [
            { text: "PATENT SUBMISSION ANALYSIS", duration: 1.8 },
            { text: "R&D IMPACT ASSESSMENT", duration: 1.4 }
        ]
      },
      {
        title: "Design Leadership",
        hue: HUE_ASSIGNMENT_ROW_HUES[9], // Yellow
        timings: { introDelayMs: 200, outroDelayMs: 300 },
        progressiveLines: [
            { text: "MENTORSHIP PROTOCOLS", duration: 1.1 },
            { text: "KNOWLEDGE TRANSFER EFFICIENCY", duration: 1.6 }
        ]
      },
      {
        title: "Technical Proficiency",
        hue: HUE_ASSIGNMENT_ROW_HUES[6], // Cyan
        timings: { introDelayMs: 200, outroDelayMs: 300 },
        progressiveLines: [
            { text: "B.ENG, DISTINCTION (VERIFIED)", duration: 1.3 },
            { text: "STATE MANAGEMENT ANALYSIS", duration: 1.7 }
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
            hue: HUE_ASSIGNMENT_ROW_HUES[10], // Orange
            timings: { introDelayMs: 200, outroDelayMs: 300 },
            progressiveLines: [
                { text: "RECRUITMENT PIPELINE ANALYSIS", duration: 1.5 },
                { text: "TEAM GROWTH METRICS (5 -> 14)", duration: 1.2 }
            ]
        },
        {
            title: "Talent Development",
            hue: HUE_ASSIGNMENT_ROW_HUES[5], // Sky Blue
            timings: { introDelayMs: 200, outroDelayMs: 300 },
            progressiveLines: [
                { text: "MENTORSHIP PROGRAM OUTCOMES", duration: 1.4 },
                { text: "PERFORMANCE REVIEW ANALYSIS", duration: 1.9 }
            ]
        },
        {
            title: "Strategic Alignment",
            hue: HUE_ASSIGNMENT_ROW_HUES[3], // Purple
            timings: { introDelayMs: 200, outroDelayMs: 300 },
            progressiveLines: [
                { text: "OKR ACHIEVEMENT AUDIT", duration: 1.6 },
                { text: "X-FUNCTIONAL COLLABORATION", duration: 1.3 }
            ]
        },
        {
            title: "Executive Training",
            hue: HUE_ASSIGNMENT_ROW_HUES[2], // Magenta
            timings: { introDelayMs: 200, outroDelayMs: 300 },
            progressiveLines: [
                { text: "INSEAD PROGRAM (VERIFIED)", duration: 1.2 },
                { text: "LEADERSHIP FRAMEWORK INTEGRATION", duration: 2.0 }
            ]
        }
    ]
  }
};