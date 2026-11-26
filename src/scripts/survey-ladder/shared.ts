/**
 * Survey Ladder: constants and helpers every role uses. Overview in index.ts
 */
import { ENGrid, EngridLogger } from "@4site/engrid-scripts";

// ?survey_ladder=1 in the iframe src: ladder mode even if ENgrid can't read
// the parent URL (cross-origin, a # in it, a thank-you page on page 1)
export const LADDER_PARAM = "survey_ladder";

export const logger = new EngridLogger(
  "SurveyLadder",
  "white",
  "#7a2142",
  "📋"
);

export function inIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

/**
 * A page in an iframe on a donation thank-you page, or in an iframe whose
 * src has ?survey_ladder=1. True for any page there, not only the survey.
 * ENgrid sets "embedded" before onLoad, so index.ts can call this before
 * starting Remember Me.
 */
export function isEmbeddedOnThankYouPage(): boolean {
  if (!inIframe()) return false;
  return (
    ENGrid.getBodyData("embedded") === "thank-you-page-donation" ||
    ENGrid.getUrlParameter(LADDER_PARAM) === "1"
  );
}

// Shows with or without ?debug=true: these need a fix in the page builder
export function configError(message: string) {
  console.error(`SurveyLadder: ${message}`);
}

// Only after DOM changes made on load. ENgrid 0.28.5 resends the height on
// clicks and errors, not on DOM changes; 0.28.6+ (ResizeObserver) doesn't
// need this
export function resizeIframe() {
  window.dispatchEvent(new Event("resize"));
}
