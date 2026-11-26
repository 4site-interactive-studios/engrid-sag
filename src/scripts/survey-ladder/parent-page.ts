/**
 * Survey Ladder: the donation thank-you page that embeds the survey (the
 * parent page). Loads the survey only on single-step forms, keeps the page
 * still while the survey moves to its own thank-you page, and submits the
 * brand opt-in once the answer is saved. Lives in the theme, not in the TY
 * Code Block, so it's versioned and the same on every brand. Overview in
 * index.ts
 */
import { ENGrid, IframeQueue } from "@4site/engrid-scripts";
import { configError, logger } from "./shared";

const IFRAME_CLASS = "survey-ladder-iframe";
// The snippet keeps the survey URL here, so nothing loads until the parent
// role checks the page
const SRC_ATTRIBUTE = "data-survey-ladder-src";
// Brand opt-in page ID, on the snippet's iframe (one opt-in page per brand)
const OPTIN_ATTRIBUTE = "data-survey-ladder-optin";
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
  // the thank-you page). Anywhere else the iframe goes. The survey URL is in
  // data-survey-ladder-src, so nothing has loaded yet
  if (ENGrid.getPageCount() !== 2 || ENGrid.getPageNumber() !== 2) {
    logger.log("Not a single-step thank-you page, removing the survey");
    iframe.remove();
    return;
  }

  // Same scroll fix as NWF's Opt-In Ladder: the iframe changing height
  // doesn't make the browser scroll the page
  document.documentElement.style.overflowAnchor = "none";

  const optInPageId = iframe.getAttribute(OPTIN_ATTRIBUTE);
  if (!optInPageId) {
    configError(
      `No brand opt-in page on the embed (${OPTIN_ATTRIBUTE}). Answers save, but no opt-in is sent`
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

  const src = iframe.getAttribute(SRC_ATTRIBUTE);
  if (src && !iframe.getAttribute("src")) {
    iframe.src = withSubtheme(src);
  }
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

/**
 * The survey takes the donation page's brand look: its subtheme goes on the
 * survey URL, unless the snippet sets one. SAG's when the page has none
 */
function withSubtheme(src: string): string {
  const url = new URL(src, window.location.href);
  if (!url.searchParams.has(SUBTHEME_PARAM)) {
    url.searchParams.set(
      SUBTHEME_PARAM,
      ENGrid.getBodyData("subtheme") || DEFAULT_SUBTHEME
    );
  }
  return `${url.pathname}${url.search}`;
}

/**
 * SOW 1.1: right after the answer is saved, an invisible submission to the
 * brand's opt-in page (email plus that one opt-in) sets it to "Y".
 * IframeQueue loads it in a hidden iframe, fills the email and submits.
 * Hidden with visibility, so nothing in it can take focus
 */
function submitBrandOptIn(pageId: string, email: string) {
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
