/**
 * Survey Ladder
 *
 * Asks each supporter one survey question at a time on donation thank-you
 * pages, always the first one they haven't answered (SOW: SAG Survey Ladder).
 * The same bundle runs in three windows, one file per role:
 * - survey-page.ts: the survey page, inside the iframe (the ladder) or opened
 *   directly, and the survey's own thank-you page
 * - questions.ts: reading each question's field and its saved answer
 * - parent-page.ts: the donation thank-you page that embeds the survey, and
 *   the brand opt-in submission
 * - shared.ts: constants and helpers every role uses
 * The brand opt-in page itself only runs ENgrid's IframeQueue (started in
 * src/index.ts).
 *
 * Each question is a Form Block with the classes "survey-ladder" and
 * "direction-column", holding one custom supporter field of type Checkbox or
 * Radio. EN renders the options and saves the checked ones as a
 * comma-separated list (a single value for Radio).
 *
 * Saved answers come from EN supporter data merge tags, since ?chain fills the
 * email but not custom supporter fields. One Text Block with the class
 * "survey-ladder-saved" (hidden by CSS) holds a merge tag per question, each in
 * a paragraph named after its field:
 *   <p class="survey-ladder-saved--NOT_TAGGED_20">{user_data~...}</p>
 * EN renders a merge tag as is (with its braces) when it doesn't know the
 * supporter. For a known supporter, a wrong field name in the tag renders
 * empty, like an unanswered question: that question keeps showing, and
 * nothing can be logged.
 *
 * Survey page in an iframe on a donation thank-you page (the ladder): shows
 * only the first question with no saved answer, and at least one option is
 * required. Only questions whose merge tag rendered take part; the others
 * can't tell answered from unanswered and would show forever. Shows nothing
 * when EN doesn't know the supporter (no email, or no merge tag rendered).
 * CSS hides the survey inside any iframe until this script picks the question,
 * so a failure shows nothing. src/index.ts doesn't start Remember Me there, so
 * its cookie can't fill the email.
 *
 * Survey page anywhere else (opened directly, from an email campaign link, or
 * chained from another page): every question shows. EN pre-checks the options
 * itself when it pre-fills the page; when it doesn't (a ?chain redirect), the
 * options in the merge tag are pre-checked here, so an earlier answer is kept.
 *
 * Parent thank-you page (iframe with the class "survey-ladder-iframe" and the
 * survey page ID in data-survey-ladder-page): loads the survey only on
 * single-step forms, and keeps the page still while the survey moves to its
 * own thank-you page.
 *
 * Brand opt-in: once the answer is saved (the survey reaches its
 * thank-you page), the parent page submits that brand's small opt-in page in
 * a hidden iframe, through ENgrid's IframeQueue. The opt-in page ID is on the
 * snippet (data-survey-ladder-optin), so one survey page serves every brand.
 * The survey also takes the donation page's subtheme (brand look).
 *
 * Configuration errors go to console.error, with or without ?debug=true.
 */
import { ignoreQueueIframeMessages, runOnParentPage } from "./parent-page";
import { inIframe, isEmbeddedOnThankYouPage } from "./shared";
import { runOnSurveyPage } from "./survey-page";

export class SurveyLadder {
  constructor() {
    runOnSurveyPage();
    if (!inIframe()) runOnParentPage();
  }

  // See shared.ts. Called by src/index.ts before starting Remember Me
  static isEmbeddedOnThankYouPage(): boolean {
    return isEmbeddedOnThankYouPage();
  }

  // See parent-page.ts. Called by src/index.ts before new App
  static ignoreQueueIframeMessages() {
    ignoreQueueIframeMessages();
  }
}
