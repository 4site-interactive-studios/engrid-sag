/**
 * Survey Ladder: the donation thank-you page that embeds the survey (the
 * parent page). Loads the survey only on single-step forms, keeps the page
 * still while the survey moves to its own thank-you page, and submits the
 * brand opt-in once the answer is saved. Lives in the theme, not in the TY
 * Code Block, so it's versioned and the same on every brand. Overview in
 * index.ts
 */
import { ENGrid, IframeQueue } from "@4site/engrid-scripts";
import { LADDER_PARAM, configError, logger } from "./shared";

const IFRAME_CLASS = "survey-ladder-iframe";
// Survey page ID, on the snippet's iframe. Only the ID: the code builds the
// URL, so no text from the page ever becomes the iframe's src
const PAGE_ATTRIBUTE = "data-survey-ladder-page";
// Brand opt-in page ID, on the snippet's iframe (one opt-in page per brand)
const OPTIN_ATTRIBUTE = "data-survey-ladder-optin";
// What the survey needs in the iframe: ?chain identifies the supporter,
// survey_ladder=1 turns on ladder mode, engrid_hide drops the page chrome
const SURVEY_QUERY = [
  "chain",
  `${LADDER_PARAM}=1`,
  "engrid_hide[body-headerOutside]=class",
  "engrid_hide[body-banner]=class",
  "engrid_hide[content-footer]=class",
  "engrid_hide[page-backgroundImage]=class",
].join("&");
// The survey takes the brand's look from this URL param (ENgrid's
// UrlParamsToBodyAttrs puts it on the survey's body)
const SUBTHEME_PARAM = "data-engrid-subtheme";
const DEFAULT_SUBTHEME = "sag";

export function runOnParentPage() {
  const iframe = document.querySelector<HTMLIFrameElement>(
    `iframe.${IFRAME_CLASS}`
  );
  if (!iframe) return;

  // Only on the thank-you page of a single-step form (one form page, then
  // the thank-you page). Anywhere else the iframe goes. The iframe has no src
  // in the snippet, so nothing has loaded yet
  if (ENGrid.getPageCount() !== 2 || ENGrid.getPageNumber() !== 2) {
    logger.log("Not a single-step thank-you page, removing the survey");
    iframe.remove();
    return;
  }

  // Same scroll fix as NWF's Opt-In Ladder: the iframe changing height
  // doesn't make the browser scroll the page
  document.documentElement.style.overflowAnchor = "none";

  const surveyPageId = readPageId(iframe, PAGE_ATTRIBUTE);
  if (!surveyPageId) {
    configError(
      `No survey page ID on the embed (${PAGE_ATTRIBUTE}). Nothing loads`
    );
    return;
  }

  const optInPageId = readPageId(iframe, OPTIN_ATTRIBUTE);
  if (!optInPageId) {
    configError(
      `No brand opt-in page ID on the embed (${OPTIN_ATTRIBUTE}). Answers save, but no opt-in is sent`
    );
  }

  // The email the answer was saved under, read when the survey is submitted
  let email = "";

  // ENgrid sends "submit" from the survey's onSubmit. Freezing the height
  // keeps the iframe from shrinking when the survey's thank-you page loads
  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.source !== iframe.contentWindow) return;
    if (event.data?.status === "submit") {
      iframe.style.minHeight = `${iframe.offsetHeight}px`;
      email = readIframeEmail(iframe);
    }
  });

  iframe.addEventListener("load", () => {
    const page = getIframePageNumber(iframe);
    // Back on page 1 (the Back button, or an EN error after submit): the
    // height follows the page again, so a hidden survey doesn't leave an
    // empty box, and nothing was saved, so no opt-in. On load, not on
    // ENgrid's height message: one also comes 100ms after the submit click,
    // before the thank-you page
    if (page === 1) {
      iframe.style.minHeight = "";
      email = "";
      return;
    }
    // The survey's thank-you page: the answer is saved. Once per answer, so
    // a reload of the thank-you page doesn't send it again
    if (page > 1 && email && optInPageId) {
      submitBrandOptIn(optInPageId, email);
      email = "";
    }
  });

  iframe.src = surveyUrl(surveyPageId);
}

/**
 * ENgrid's iFrame code in the hidden opt-in iframe sends its height and asks
 * the parent to scroll (its referrer is an EN page, and IframeQueue strips
 * ?chain). ENgrid's parent would grow the hidden iframe and scroll the page
 * to it. index.ts calls this before new App, so this listener runs before
 * ENgrid's in every browser and stops those messages. IframeQueue's own
 * messages (with a "type") pass
 */
export function ignoreQueueIframeMessages() {
  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || typeof data !== "object") return;
    if (!("frameHeight" in data || "scroll" in data || "scrollTo" in data)) {
      return;
    }
    const fromQueue = Array.from(
      document.querySelectorAll<HTMLIFrameElement>(
        "iframe.engrid-iframe--queue"
      )
    ).some((iframe) => iframe.contentWindow === event.source);
    if (fromQueue) event.stopImmediatePropagation();
  });
}

// A page ID from the snippet, as a number (null if it isn't one)
function readPageId(iframe: HTMLIFrameElement, attribute: string) {
  const value = (iframe.getAttribute(attribute) || "").trim();
  return /^\d+$/.test(value) ? parseInt(value, 10) : null;
}

/**
 * Built from fixed parts and the page ID as a number. The survey takes the
 * donation page's brand look: its subtheme goes on the URL, SAG's when the
 * page has none (or an unexpected one)
 */
function surveyUrl(pageId: number): string {
  const subtheme = ENGrid.getBodyData("subtheme") || "";
  const safeSubtheme = /^[a-z0-9-]+$/.test(subtheme)
    ? subtheme
    : DEFAULT_SUBTHEME;
  // Debug on the donation page (e.g. assets=local) turns it on in the survey,
  // since the snippet no longer carries the URL
  const debug = ENGrid.debug ? "&debug=true" : "";
  return `/page/${pageId}/data/1?${SURVEY_QUERY}&${SUBTHEME_PARAM}=${encodeURIComponent(
    safeSubtheme
  )}${debug}`;
}

/**
 * SOW 1.1: right after the answer is saved, an invisible submission to the
 * brand's opt-in page (email plus that one opt-in) sets it to "Y".
 * IframeQueue loads it in a hidden iframe, fills the email and submits.
 * Hidden with visibility, so nothing in it can take focus
 */
function submitBrandOptIn(pageId: number, email: string) {
  const queue = IframeQueue.getInstance();
  queue.enqueue({
    url: `/page/${pageId}/data/1`,
    fields: { "supporter.emailAddress": email },
    iframeStyle: { visibility: "hidden" },
    onComplete: () => logger.log(`Brand opt-in sent (page ${pageId})`),
    onError: (error) =>
      logger.error(`Brand opt-in failed (page ${pageId}): ${error.message}`),
  });
  queue.process().catch(() => {
    // Logged in onError
  });
}

function readIframeEmail(iframe: HTMLIFrameElement): string {
  try {
    const field = iframe.contentDocument?.querySelector<HTMLInputElement>(
      '[name="supporter.emailAddress"]'
    );
    return field?.value || "";
  } catch (e) {
    return ""; // Cross-origin: can't read the survey page
  }
}

function getIframePageNumber(iframe: HTMLIFrameElement): number {
  try {
    const pageJson = (iframe.contentWindow as any)?.pageJson;
    return Number(pageJson?.pageNumber) || 0;
  } catch (e) {
    return 0; // Cross-origin: can't read the survey page
  }
}
