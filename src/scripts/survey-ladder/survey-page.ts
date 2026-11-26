/**
 * Survey Ladder: the survey page. Inside the iframe on a donation thank-you
 * page it runs as the ladder (one question per action); opened directly it
 * shows every question. Also sets up the survey's own thank-you page in the
 * iframe. Overview in index.ts
 */
import { ENGrid, EnForm } from "@4site/engrid-scripts";
import {
  SurveyQuestion,
  isAnswered,
  preselect,
  readQuestion,
  reportRawMergeTags,
} from "./questions";
import {
  LADDER_PARAM,
  isEmbeddedOnThankYouPage,
  logger,
  resizeIframe,
} from "./shared";

const ERROR_KEY = "surveyLadder.error"; // EngridI18n key
const ERROR_FALLBACK = "Please choose at least one option.";
// On a block of the survey's own thank-you page
const THANK_YOU_CLASS = "survey-ladder-thank-you";

export function runOnSurveyPage() {
  const embedded = isEmbeddedOnThankYouPage();

  if (embedded && document.querySelector(`.${THANK_YOU_CLASS}`)) {
    setUpThankYouPage();
    return;
  }

  const formBlocks = Array.from(
    document.querySelectorAll<HTMLElement>(
      ".en__component--formblock.survey-ladder"
    )
  );
  if (formBlocks.length === 0) return; // Not the survey page
  if (ENGrid.getPageNumber() !== 1) return; // The survey's own thank-you page

  // Broken blocks are logged and left out
  const questions = formBlocks
    .map((formBlock) => readQuestion(formBlock))
    .filter((question): question is SurveyQuestion => question !== null);

  if (embedded) {
    runLadder(formBlocks, questions);
  } else {
    logger.log("Not embedded on a thank-you page, showing every question");
    if (questions.some((question) => question.mergeTag === "rendered")) {
      reportRawMergeTags(questions);
    }
    questions.forEach((question) => preselect(question));
  }
}

// One question per action: the first one the supporter hasn't answered
function runLadder(formBlocks: HTMLElement[], questions: SurveyQuestion[]) {
  if (!ENGrid.getFieldValue("supporter.emailAddress")) {
    hideSurvey("Supporter not identified (no email)");
    return;
  }

  // Only a rendered merge tag tells answered from unanswered. None rendered:
  // EN doesn't know the supporter, or the Text Block is missing
  const usable = questions.filter(
    (question) => question.mergeTag === "rendered"
  );
  if (usable.length === 0) {
    hideSurvey("No merge tag rendered");
    return;
  }
  reportRawMergeTags(questions);

  const current = usable.find((question) => !isAnswered(question));
  if (!current) {
    hideSurvey("Every question is answered");
    return;
  }

  // Keep only the current question, so only its field is posted
  formBlocks.forEach((formBlock) => {
    if (formBlock !== current.formBlock) formBlock.remove();
  });

  const form = EnForm.getInstance();
  const hasAnswer = () => current.options.some((option) => option.checked);

  // The click on an option makes ENgrid resend the iframe height
  current.options.forEach((option) =>
    option.addEventListener("change", () => {
      if (hasAnswer()) ENGrid.removeError(current.field);
    })
  );

  // ENgrid's A11y announces the error, ties it to the field's group and
  // focuses the first option; setError makes ENgrid resend the iframe height
  form.onValidate.subscribe(() => {
    if (hasAnswer()) return;
    ENGrid.setError(current.field, errorMessage());
    form.validate = false;
  });

  const step = formBlocks.indexOf(current.formBlock) + 1;
  const total = formBlocks.length;

  // EN error after submit: EN shows page 1 again with its error list, and the
  // same question shows again, since its answer wasn't saved
  const serverErrors = document.querySelectorAll(".en__errorList li");
  if (serverErrors.length > 0) {
    logger.error(
      `EN returned an error on submit: ${Array.from(serverErrors)
        .map((error) => error.textContent?.trim())
        .join(" | ")}`
    );
  }

  // The survey's thank-you page gets ?chain&survey_ladder=1 too. With ?chain,
  // ENgrid's iFrame doesn't ask the parent to scroll when it loads
  // (iframe.js shouldScroll), and the flag keeps ladder mode there without
  // ENgrid's parent URL check. EN doesn't carry the query by itself
  const enForm = ENGrid.enForm;
  if (enForm?.action) {
    const action = new URL(enForm.action, window.location.href);
    action.searchParams.set("chain", "");
    action.searchParams.set(LADDER_PARAM, "1");
    enForm.action = action.toString();
  }

  // Last, once the other blocks are gone: shows the question (CSS) and drops
  // the page padding
  ENGrid.setBodyData("survey-ladder", "ladder");
  logger.log(`Showing question ${step} of ${total} (${current.fieldName})`);
  resizeIframe();
}

// The survey's own thank-you page, in the iframe after the answer: same box,
// filling the iframe, with the message centered (CSS)
function setUpThankYouPage() {
  ENGrid.setBodyData("survey-ladder-step", "thank-you");
  fillIframe();
  ENGrid.setBodyData("survey-ladder", "ladder"); // Shows the box (CSS)
  focusThankYou();
  resizeIframe();
}

/**
 * The parent keeps the iframe at the question's height (parent-page.ts), so
 * the box grows to fill it and the thank-you message sits in the same space.
 * Runs while .body-main is still hidden (CSS), so the body's height is
 * everything else. min-height is a floor: a taller message still grows the
 * box. A px value set once: a vh height would feed back into the height
 * ENgrid sends and keep growing the iframe
 */
function fillIframe() {
  const bodyMain = document.querySelector<HTMLElement>(".body-main");
  if (!bodyMain) return;
  const height = window.innerHeight - document.body.offsetHeight;
  if (height > 0) bodyMain.style.minHeight = `${height}px`;
}

// Screen readers land on the thank-you message after the answer.
// preventScroll: focusing inside the iframe can scroll the parent page
function focusThankYou() {
  const message = document.querySelector<HTMLElement>(`.${THANK_YOU_CLASS}`);
  if (!message) return;
  message.setAttribute("tabindex", "-1");
  message.focus({ preventScroll: true });
}

function errorMessage(): string {
  const text = ENGrid.t(ERROR_KEY);
  return text && text !== ERROR_KEY ? text : ERROR_FALLBACK;
}

function hideSurvey(reason: string) {
  logger.log(`Hiding the survey: ${reason}`);
  ENGrid.setBodyData("survey-ladder", "hidden");
  resizeIframe();
}
