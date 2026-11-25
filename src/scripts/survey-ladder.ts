/**
 * Survey Ladder
 *
 * Survey page, embedded on a thank-you page: shows the first question the
 * supporter hasn't answered and turns its option list into checkboxes. The
 * question's hidden supporter field (Text type) saves the labels of the checked
 * options as a comma-separated list, for example
 * "Ministries stories, Community updates (Franciscan Way)".
 *
 * Survey page anywhere else (opened directly, from an email campaign link, or
 * chained from another page): every question shows as checkboxes, nothing is
 * hidden, and nothing is required.
 *
 * In both cases, options whose labels are already in the hidden field come
 * pre-checked, so a pre-filled page never wipes an earlier answer.
 *
 * Parent thank-you page: covers the iframe with a thank-you curtain once the
 * survey reaches its own thank-you page, without the parent page jumping.
 *
 * Survey page structure (EN page builder, inside body-main with the
 * "force-visibility" class):
 * - Text Block, class "survey-ladder-question": the question in a <p>, the
 *   options in a <ul>, and a <p class="survey-ladder-saved"> holding the
 *   supporter data merge tag of that question's field
 * - Form Block, class "survey-ladder": that question's hidden field (Text type)
 *
 * On the embedded thank-you page, the answered state comes from the merge tags:
 * ?chain fills the email but not custom supporter fields.
 *
 * Option labels must not contain commas, since commas separate the saved labels.
 */
import { ENGrid, EnForm, EngridLogger } from "@4site/engrid-scripts";

const SUBMITTED_MESSAGE = "engrid-survey-ladder:submitted";
const ERROR_MESSAGE = "Please choose at least one option.";
const DEFAULT_CURTAIN_TEXT = "Thank you! Your answer was saved.";
const LABEL_SEPARATOR = ", ";

interface SurveyQuestion {
  block: HTMLElement;
  formBlock: HTMLElement;
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
    if (!this.inIframe()) this.runOnParentPage();
  }

  private runOnSurveyPage() {
    const blocks = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".en__component--copyblock.survey-ladder-question"
      )
    );
    if (blocks.length === 0) return; // Not the survey page
    if (ENGrid.getPageNumber() !== 1) return; // The survey's own thank-you page

    const onThankYouPage =
      this.inIframe() &&
      ENGrid.getBodyData("embedded") === "thank-you-page-donation";

    const formBlocks = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".en__component--formblock.survey-ladder"
      )
    );
    if (blocks.length !== formBlocks.length) {
      this.logger.error(
        `Found ${blocks.length} questions and ${formBlocks.length} form blocks; each question needs one of each`
      );
      if (onThankYouPage) this.hideSurvey("Page structure doesn't match");
      return;
    }
    const questions: SurveyQuestion[] = blocks.map((block, index) => ({
      block,
      formBlock: formBlocks[index],
    }));

    if (onThankYouPage) {
      this.runLadder(questions);
    } else {
      this.logger.log("Not embedded on a thank-you page, showing every question");
      questions.forEach((question, index) =>
        this.setUpQuestion(question, index, false)
      );
    }
  }

  // One question per action: the first one the supporter hasn't answered
  private runLadder(questions: SurveyQuestion[]) {
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
      if (index === current) return;
      question.block.remove();
      question.formBlock.remove();
    });

    if (!this.setUpQuestion(questions[current], current, true)) {
      this.hideSurvey("Question structure doesn't match");
      return;
    }

    this.form.onSubmit.subscribe(() => {
      window.parent.postMessage(
        { type: SUBMITTED_MESSAGE },
        window.location.origin
      );
    });

    this.logger.log(`Showing question ${current + 1} of ${questions.length}`);
    this.resizeIframe();
  }

  // Turns the option list into checkboxes tied to the hidden field
  private setUpQuestion(
    question: SurveyQuestion,
    index: number,
    required: boolean
  ): boolean {
    const field = this.getField(question);
    const list = question.block.querySelector("ul");
    const questionText = question.block.querySelector<HTMLElement>(
      "p:not(.survey-ladder-saved)"
    );
    if (!field || !list || !questionText) {
      this.logger.error(
        `Question ${index + 1} is missing its text, option list, or field`
      );
      return false;
    }

    const { group, options } = this.renderOptions(list, questionText, index);
    this.preselect(options, field.value);

    const checkedLabels = () =>
      options.filter((option) => option.checked).map((option) => option.value);

    options.forEach((option) =>
      option.addEventListener("change", () => {
        const labels = checkedLabels();
        field.value = labels.join(LABEL_SEPARATOR);
        if (labels.length > 0) {
          ENGrid.removeError(group);
          this.resizeIframe();
        }
      })
    );

    if (required) {
      this.form.onValidate.subscribe(() => {
        const labels = checkedLabels();
        if (labels.length === 0) {
          ENGrid.setError(group, ERROR_MESSAGE);
          this.form.validate = false;
          this.resizeIframe();
          return;
        }
        field.value = labels.join(LABEL_SEPARATOR);
      });
    }
    return true;
  }

  // Checks the options whose labels are already saved in the hidden field
  private preselect(options: HTMLInputElement[], savedValue: string) {
    const saved = this.parseLabels(savedValue);
    if (saved.length === 0) return;
    options.forEach((option) => {
      option.checked = saved.includes(option.value);
    });
    const unknown = saved.filter(
      (label) => !options.some((option) => option.value === label)
    );
    if (unknown.length > 0) {
      this.logger.log(`Saved labels not in the option list: ${unknown.join(" | ")}`);
    }
  }

  private runOnParentPage() {
    const iframe = document.querySelector<HTMLIFrameElement>(
      "iframe.survey-ladder-iframe"
    );
    const wrapper = iframe?.parentElement;
    if (!iframe || !wrapper) return;

    // The iframe's own container holds the curtain; moving the iframe would reload it
    wrapper.classList.add("survey-ladder-wrapper");
    const curtain =
      wrapper.querySelector<HTMLElement>(".survey-ladder-curtain") ??
      this.createCurtain(wrapper);
    curtain.hidden = true;
    curtain.setAttribute("aria-live", "polite");

    // Same scroll fix as NWF's Opt-In Ladder
    document.documentElement.style.overflowAnchor = "none";

    // Freeze the height on submit so the page doesn't jump while the survey TY loads
    window.addEventListener("message", (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== iframe.contentWindow) return;
      if (event.data?.type !== SUBMITTED_MESSAGE) return;
      wrapper.style.minHeight = `${iframe.offsetHeight}px`;
    });

    // Show the curtain once the survey reaches its own thank-you page
    iframe.addEventListener("load", () => {
      if (this.getIframePageNumber(iframe) > 1) {
        curtain.hidden = false;
        this.logger.log("Survey answered, showing the curtain");
      }
    });
  }

  private renderOptions(
    list: HTMLUListElement,
    questionText: HTMLElement,
    questionIndex: number
  ) {
    questionText.id = `survey-ladder-question-${questionIndex}`;

    // EN's checkbox markup, so the theme styles apply; no name, so nothing is posted
    const group = document.createElement("div");
    group.className = "en__field en__field--checkbox survey-ladder-options";
    const element = document.createElement("div");
    element.className = "en__field__element en__field__element--checkbox";
    element.setAttribute("role", "group");
    element.setAttribute("aria-labelledby", questionText.id);

    const options = Array.from(list.querySelectorAll("li")).map(
      (item, index) => {
        const label = (item.textContent || "").trim();
        if (label.includes(",")) {
          this.logger.error(`Option "${label}" has a comma; commas separate saved labels`);
        }
        const id = `survey-ladder-option-${questionIndex}-${index}`;
        const wrapper = document.createElement("div");
        wrapper.className = "en__field__item";
        const option = document.createElement("input");
        option.type = "checkbox";
        option.id = id;
        option.className = "en__field__input en__field__input--checkbox";
        option.value = label;
        const labelElement = document.createElement("label");
        labelElement.className = "en__field__label en__field__label--item";
        labelElement.htmlFor = id;
        labelElement.textContent = label;
        wrapper.append(option, labelElement);
        element.append(wrapper);
        return option;
      }
    );

    group.append(element);
    list.replaceWith(group);
    return { group, options };
  }

  private createCurtain(wrapper: HTMLElement): HTMLElement {
    const curtain = document.createElement("div");
    curtain.className = "survey-ladder-curtain";
    const text = document.createElement("p");
    text.textContent = DEFAULT_CURTAIN_TEXT;
    curtain.append(text);
    wrapper.append(curtain);
    return curtain;
  }

  private getField(question: SurveyQuestion): HTMLInputElement | null {
    return question.formBlock.querySelector<HTMLInputElement>(
      'input[name^="supporter."]'
    );
  }

  // Answered: the merge tag rendered saved labels, or the hidden field came pre-filled
  private isAnswered(question: SurveyQuestion): boolean {
    const saved = question.block.querySelector(".survey-ladder-saved");
    const fromMergeTag = this.parseLabels(saved?.textContent || "");
    const fromField = this.parseLabels(this.getField(question)?.value || "");
    return fromMergeTag.length > 0 || fromField.length > 0;
  }

  private parseLabels(value: string): string[] {
    return value
      .split(",")
      .map((label) => label.trim())
      .filter((label) => label !== "");
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

  private getIframePageNumber(iframe: HTMLIFrameElement): number {
    try {
      const pageJson = (iframe.contentWindow as any)?.pageJson;
      return Number(pageJson?.pageNumber) || 0;
    } catch (e) {
      return 0; // Cross-origin: can't read the survey page
    }
  }

  private inIframe(): boolean {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }
}
