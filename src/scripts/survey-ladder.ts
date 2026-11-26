/**
 * Survey Ladder
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
 * so a failure shows nothing. index.ts doesn't start Remember Me there, so its
 * cookie can't fill the email.
 *
 * Survey page anywhere else (opened directly, from an email campaign link, or
 * chained from another page): every question shows. EN pre-checks the options
 * itself when it pre-fills the page; when it doesn't (a ?chain redirect), the
 * options in the merge tag are pre-checked here, so an earlier answer is kept.
 *
 * Parent thank-you page (iframe with the class "survey-ladder-iframe"): keeps
 * the page still while the survey moves to its own thank-you page.
 *
 * EN joins the checked values of a Checkbox with commas. Saved values are
 * matched against the field's own options, so a value with a comma (e.g.
 * "Yes, regularly") stays whole. Radio saves a single value.
 *
 * Configuration errors go to console.error, with or without ?debug=true.
 */
import { ENGrid, EnForm, EngridLogger } from "@4site/engrid-scripts";

const ERROR_KEY = "surveyLadder.error"; // EngridI18n key
const ERROR_FALLBACK = "Please choose at least one option.";
const SAVED_CLASS = "survey-ladder-saved";
const IFRAME_CLASS = "survey-ladder-iframe";
// On a block of the survey's own thank-you page
const THANK_YOU_CLASS = "survey-ladder-thank-you";
// ?survey_ladder=1 in the iframe src: ladder mode even if ENgrid can't read
// the parent URL (cross-origin, a # in it, a thank-you page on page 1)
const LADDER_PARAM = "survey_ladder";

type MergeTagState = "rendered" | "raw" | "missing";

interface SurveyQuestion {
  formBlock: HTMLElement;
  field: HTMLElement; // The .en__field wrapper, for errors
  fieldName: string; // e.g. supporter.NOT_TAGGED_20
  options: HTMLInputElement[];
  mergeTag: MergeTagState;
  saved: string[]; // Values from the merge tag
}

export class SurveyLadder {
  private logger: EngridLogger = new EngridLogger(
    "SurveyLadder",
    "white",
    "#7a2142",
    "📋"
  );
  private form: EnForm = EnForm.getInstance();

  constructor() {
    this.runOnSurveyPage();
    if (!SurveyLadder.inIframe()) this.runOnParentPage();
  }

  /**
   * A page in an iframe on a donation thank-you page, or in an iframe whose
   * src has ?survey_ladder=1. True for any page there, not only the survey.
   * ENgrid sets "embedded" before onLoad, so index.ts can call this before
   * starting Remember Me.
   */
  static isEmbeddedOnThankYouPage(): boolean {
    if (!SurveyLadder.inIframe()) return false;
    return (
      ENGrid.getBodyData("embedded") === "thank-you-page-donation" ||
      ENGrid.getUrlParameter(LADDER_PARAM) === "1"
    );
  }

  private static inIframe(): boolean {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }

  private runOnSurveyPage() {
    const embedded = SurveyLadder.isEmbeddedOnThankYouPage();

    // The survey's own thank-you page, in the iframe after the answer: no padding either
    if (embedded && document.querySelector(`.${THANK_YOU_CLASS}`)) {
      ENGrid.setBodyData("survey-ladder", "ladder");
      this.resizeIframe();
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
      .map((formBlock) => this.readQuestion(formBlock))
      .filter((question): question is SurveyQuestion => question !== null);

    if (embedded) {
      this.runLadder(formBlocks, questions);
    } else {
      this.logger.log(
        "Not embedded on a thank-you page, showing every question"
      );
      if (questions.some((question) => question.mergeTag === "rendered")) {
        this.reportRawMergeTags(questions);
      }
      questions.forEach((question) => this.preselect(question));
    }
  }

  // One question per action: the first one the supporter hasn't answered
  private runLadder(formBlocks: HTMLElement[], questions: SurveyQuestion[]) {
    if (!ENGrid.getFieldValue("supporter.emailAddress")) {
      this.hideSurvey("Supporter not identified (no email)");
      return;
    }

    // Only a rendered merge tag tells answered from unanswered. None rendered:
    // EN doesn't know the supporter, or the Text Block is missing
    const usable = questions.filter(
      (question) => question.mergeTag === "rendered"
    );
    if (usable.length === 0) {
      this.hideSurvey("No merge tag rendered");
      return;
    }
    this.reportRawMergeTags(questions);

    const current = usable.find((question) => !this.isAnswered(question));
    if (!current) {
      this.hideSurvey("Every question is answered");
      return;
    }

    // Keep only the current question, so only its field is posted
    formBlocks.forEach((formBlock) => {
      if (formBlock !== current.formBlock) formBlock.remove();
    });

    const hasAnswer = () => current.options.some((option) => option.checked);

    // The click on an option makes ENgrid resend the iframe height
    current.options.forEach((option) =>
      option.addEventListener("change", () => {
        if (hasAnswer()) ENGrid.removeError(current.field);
      })
    );

    // ENgrid's A11y announces the error, ties it to the field's group and
    // focuses the first option; setError makes ENgrid resend the iframe height
    this.form.onValidate.subscribe(() => {
      if (hasAnswer()) return;
      ENGrid.setError(current.field, this.errorMessage());
      this.form.validate = false;
    });

    const step = formBlocks.indexOf(current.formBlock) + 1;
    const total = formBlocks.length;

    // EN error after submit: EN shows page 1 again with its error list, and the
    // same question shows again, since its answer wasn't saved
    const serverErrors = document.querySelectorAll(".en__errorList li");
    if (serverErrors.length > 0) {
      this.logger.error(
        `EN returned an error on submit: ${Array.from(serverErrors)
          .map((error) => error.textContent?.trim())
          .join(" | ")}`
      );
    }

    // Last, once the other blocks are gone: shows the question (CSS) and drops
    // the page padding
    ENGrid.setBodyData("survey-ladder", "ladder");
    this.logger.log(
      `Showing question ${step} of ${total} (${current.fieldName})`
    );
    this.resizeIframe();
  }

  private readQuestion(formBlock: HTMLElement): SurveyQuestion | null {
    const options = Array.from(
      formBlock.querySelectorAll<HTMLInputElement>(
        'input[type="checkbox"][name^="supporter."], input[type="radio"][name^="supporter."]'
      )
    );
    const names = options
      .map((option) => option.name)
      .filter((name, index, all) => all.indexOf(name) === index);
    if (names.length !== 1) {
      this.configError(
        `A survey-ladder Form Block needs exactly one Checkbox or Radio field, found ${
          names.length
        }${names.length ? ` (${names.join(", ")})` : ""}. Skipped`
      );
      return null;
    }

    const fieldName = names[0];
    const key = fieldName.replace(/^supporter\./, "");
    const field = options[0].closest<HTMLElement>(".en__field");
    if (!field) {
      this.configError(`${fieldName} has no .en__field wrapper. Skipped`);
      return null;
    }

    this.labelGroup(field, key);

    const savedElement = document.querySelector(
      `.${SAVED_CLASS}--${CSS.escape(key)}`
    );
    const text = savedElement?.textContent || "";
    let mergeTag: MergeTagState = "rendered";
    if (!savedElement) {
      mergeTag = "missing";
      this.configError(
        `No merge tag found for ${fieldName} (expected .${SAVED_CLASS}--${key}). Skipped on thank-you pages`
      );
    } else if (text.indexOf("{") !== -1) {
      // Any brace, not only {user_data~...}: a tag with a typo in its syntax
      // is caught too, instead of being read as an answer
      mergeTag = "raw";
    }

    return {
      formBlock,
      field,
      fieldName,
      options,
      mergeTag,
      saved:
        mergeTag === "rendered"
          ? this.parseSaved(text, options, options[0].type === "radio")
          : [],
    };
  }

  /**
   * Screen readers read the question with its options as one group. ENgrid's
   * A11y does this for Radio fields only; this does the same for Checkbox ones.
   */
  private labelGroup(field: HTMLElement, key: string) {
    if (field.getAttribute("role") === "group") return;
    const label = field.querySelector<HTMLElement>(
      ":scope > .en__field__label"
    );
    if (!label) return;
    if (!label.id) label.id = `survey-ladder-label--${key}`;
    if (label.getAttribute("for") === "") label.removeAttribute("for");
    field.setAttribute("role", "group");
    field.setAttribute("aria-labelledby", label.id);
  }

  // For a known supporter, a raw merge tag is one EN didn't process (e.g. a typo
  // in its syntax). A wrong field name renders empty and can't be told apart
  private reportRawMergeTags(questions: SurveyQuestion[]) {
    questions
      .filter((question) => question.mergeTag === "raw")
      .forEach((question) =>
        this.configError(
          `The merge tag for ${question.fieldName} didn't render (check its syntax). Skipped on thank-you pages`
        )
      );
  }

  // Answered: the merge tag has saved values, or EN pre-checked an option
  private isAnswered(question: SurveyQuestion): boolean {
    return (
      question.saved.length > 0 ||
      question.options.some((option) => option.checked)
    );
  }

  // Pre-checks the saved options when EN didn't (e.g. a ?chain redirect)
  private preselect(question: SurveyQuestion) {
    if (question.saved.length === 0) return;
    if (question.options.some((option) => option.checked)) return;
    question.options.forEach((option) => {
      option.checked = question.saved.indexOf(option.value) !== -1;
    });
    const unknown = question.saved.filter(
      (value) => !question.options.some((option) => option.value === value)
    );
    if (unknown.length > 0) {
      this.logger.log(
        `Saved values not in ${question.fieldName}'s options: ${unknown.join(
          " | "
        )}`
      );
    }
  }

  // Matches the field's own options, longest first, so a value with a comma
  // (e.g. "Yes, regularly") isn't split. A value no longer in the options
  // (renamed or removed) runs up to the next comma
  private parseSaved(
    text: string,
    options: HTMLInputElement[],
    singleValue: boolean
  ): string[] {
    const trimmed = text.trim();
    if (!trimmed) return [];
    if (singleValue) return [trimmed];

    const values = options
      .map((option) => option.value)
      .filter((value) => value !== "")
      .sort((a, b) => b.length - a.length);
    const saved: string[] = [];
    let rest = trimmed;
    while ((rest = rest.replace(/^[\s,]+/, ""))) {
      const known = values.find(
        (value) => rest === value || rest.startsWith(`${value},`)
      );
      const comma = rest.indexOf(",");
      const value = known ?? (comma === -1 ? rest : rest.slice(0, comma));
      saved.push(value.trim());
      rest = rest.slice(value.length);
    }
    return saved;
  }

  private errorMessage(): string {
    const text = ENGrid.t(ERROR_KEY);
    return text && text !== ERROR_KEY ? text : ERROR_FALLBACK;
  }

  private hideSurvey(reason: string) {
    this.logger.log(`Hiding the survey: ${reason}`);
    ENGrid.setBodyData("survey-ladder", "hidden");
    this.resizeIframe();
  }

  // Shows with or without ?debug=true: these need a fix in the page builder
  private configError(message: string) {
    console.error(`SurveyLadder: ${message}`);
  }

  /**
   * Parent thank-you page: keeps the page still while the survey moves to its
   * own thank-you page. Lives in the theme, not in the TY Code Block, so it's
   * versioned and the same on every brand.
   */
  private runOnParentPage() {
    const iframe = document.querySelector<HTMLIFrameElement>(
      `iframe.${IFRAME_CLASS}`
    );
    if (!iframe) return;

    // Same scroll fix as NWF's Opt-In Ladder: the iframe changing height
    // doesn't make the browser scroll the page
    document.documentElement.style.overflowAnchor = "none";

    // Capture phase: runs before ENgrid's iFrame listener, so it can stop it
    window.addEventListener(
      "message",
      (event) => {
        if (event.origin !== window.location.origin) return;
        if (event.source !== iframe.contentWindow) return;
        const data = event.data || {};

        // ENgrid sends "submit" from the survey's onSubmit. Freezing the height
        // keeps the iframe from shrinking when the survey's thank-you page loads
        if (data.status === "submit") {
          iframe.style.minHeight = `${iframe.offsetHeight}px`;
          return;
        }

        // When the survey's thank-you page loads, ENgrid asks the parent to
        // scroll to the iframe (the referrer is an EN page). The answer was given
        // in place, so the page stays put. An EN error on page 1 still scrolls
        if ("scroll" in data && this.getIframePageNumber(iframe) > 1) {
          event.stopImmediatePropagation();
          this.logger.log(
            "Ignored the scroll from the survey's thank-you page"
          );
        }
      },
      true
    );
  }

  private getIframePageNumber(iframe: HTMLIFrameElement): number {
    try {
      const pageJson = (iframe.contentWindow as any)?.pageJson;
      return Number(pageJson?.pageNumber) || 0;
    } catch (e) {
      return 0; // Cross-origin: can't read the survey page
    }
  }

  // Only after DOM changes made on load. ENgrid 0.28.5 resends the height on
  // clicks and errors, not on DOM changes; 0.28.6+ (ResizeObserver) doesn't
  // need this
  private resizeIframe() {
    window.dispatchEvent(new Event("resize"));
  }
}
