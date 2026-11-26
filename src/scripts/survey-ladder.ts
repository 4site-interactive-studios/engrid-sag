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
 *
 * Survey page embedded on a thank-you page: shows only the first question
 * with no saved answer, and at least one option is required.
 *
 * Survey page anywhere else (opened directly, from an email campaign link, or
 * chained from another page): every question shows. EN pre-checks the options
 * itself when it pre-fills the page; when it doesn't (a ?chain redirect), the
 * options in the merge tag are pre-checked here, so an earlier answer is kept.
 *
 * Checkbox option values must not contain commas, since commas separate saved
 * values. Radio values can (e.g. "Yes, regularly"): Radio saves a single value.
 */
import { ENGrid, EnForm, EngridLogger } from "@4site/engrid-scripts";

const ERROR_MESSAGE = "Please choose at least one option.";
const SAVED_CLASS = "survey-ladder-saved";

interface SurveyQuestion {
  formBlock: HTMLElement;
  field: HTMLElement; // The .en__field wrapper, for errors
  fieldName: string;
  options: HTMLInputElement[];
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
  }

  private runOnSurveyPage() {
    // The survey's own thank-you page, in the iframe after the answer: no padding either
    if (this.embeddedOnThankYouPage() && ENGrid.getPageNumber() > 1) {
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

    const onThankYouPage = this.embeddedOnThankYouPage();

    const questions = formBlocks
      .map((formBlock) => this.readQuestion(formBlock))
      .filter((question): question is SurveyQuestion => question !== null);
    if (questions.length !== formBlocks.length) {
      if (onThankYouPage) this.hideSurvey("Page structure doesn't match");
      return;
    }

    if (onThankYouPage) {
      this.runLadder(questions);
    } else {
      this.logger.log("Not embedded on a thank-you page, showing every question");
      questions.forEach((question) => this.preselect(question));
    }
  }

  // One question per action: the first one the supporter hasn't answered
  private runLadder(questions: SurveyQuestion[]) {
    ENGrid.setBodyData("survey-ladder", "ladder"); // Drops the page padding (CSS)

    if (!ENGrid.getFieldValue("supporter.emailAddress")) {
      this.hideSurvey("Supporter not identified");
      return;
    }

    const current = questions.findIndex(
      (question) => !this.isAnswered(question)
    );
    if (current === -1) {
      this.hideSurvey("Every question is answered");
      return;
    }

    // Keep only the current question, so only its field is posted
    questions.forEach((question, index) => {
      if (index !== current) question.formBlock.remove();
    });

    const question = questions[current];
    const hasAnswer = () => question.options.some((option) => option.checked);

    question.options.forEach((option) =>
      option.addEventListener("change", () => {
        if (hasAnswer()) {
          ENGrid.removeError(question.field);
          this.resizeIframe();
        }
      })
    );

    this.form.onValidate.subscribe(() => {
      if (hasAnswer()) return;
      ENGrid.setError(question.field, ERROR_MESSAGE);
      this.form.validate = false;
      this.resizeIframe();
    });

    this.logger.log(
      `Showing question ${current + 1} of ${questions.length} (${question.fieldName})`
    );
    this.resizeIframe();
  }

  private readQuestion(formBlock: HTMLElement): SurveyQuestion | null {
    const options = Array.from(
      formBlock.querySelectorAll<HTMLInputElement>(
        'input[type="checkbox"][name^="supporter."], input[type="radio"][name^="supporter."]'
      )
    );
    const field = options[0]?.closest<HTMLElement>(".en__field");
    if (options.length === 0 || !field) {
      this.logger.error("A survey-ladder Form Block has no Checkbox or Radio field");
      return null;
    }

    const fieldName = options[0].name; // e.g. supporter.NOT_TAGGED_20
    const key = fieldName.replace(/^supporter\./, "");
    const savedElement = document.querySelector(`.${SAVED_CLASS}--${key}`);
    if (!savedElement) {
      this.logger.error(
        `No merge tag found for ${fieldName} (expected .${SAVED_CLASS}--${key})`
      );
    }

    return {
      formBlock,
      field,
      fieldName,
      options,
      saved: this.parseSaved(
        savedElement?.textContent || "",
        options[0].type === "radio"
      ),
    };
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
        `Saved values not in ${question.fieldName}'s options: ${unknown.join(" | ")}`
      );
    }
  }

  // An unidentified visit renders the raw merge tag, which isn't an answer
  private parseSaved(text: string, singleValue: boolean): string[] {
    if (text.indexOf("{") !== -1) return [];
    if (singleValue) return text.trim() ? [text.trim()] : [];
    return text
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value !== "");
  }

  private hideSurvey(reason: string) {
    this.logger.log(`Hiding the survey: ${reason}`);
    ENGrid.setBodyData("survey-ladder", "hidden");
    this.resizeIframe();
  }

  // ENgrid 0.28.5 only re-sends the iframe height on load and resize
  private resizeIframe() {
    window.dispatchEvent(new Event("resize"));
  }

  // Inside an iframe on a donation thank-you page (ENgrid sets "embedded")
  private embeddedOnThankYouPage(): boolean {
    return (
      this.inIframe() &&
      ENGrid.getBodyData("embedded") === "thank-you-page-donation"
    );
  }

  private inIframe(): boolean {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }
}
