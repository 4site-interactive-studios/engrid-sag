/**
 * Survey Ladder (POC)
 *
 * Survey page (inside the thank-you iframe): shows the first question the
 * supporter hasn't answered, turns its option list into checkboxes worth
 * 1, 2, 4, 8... in list order, and saves the sum of the checked options to the
 * question's hidden supporter field. Decode later with (total & value) > 0.
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
 * The answered state comes from the merge tags: ?chain fills the email but not
 * custom supporter fields.
 */
import { ENGrid, EnForm, EngridLogger } from "@4site/engrid-scripts";

const SUBMITTED_MESSAGE = "engrid-survey-ladder:submitted";
const ERROR_MESSAGE = "Please choose at least one option.";
const DEFAULT_CURTAIN_TEXT = "Thank you! Your answer was saved.";

export class SurveyLadder {
  private logger: EngridLogger = new EngridLogger(
    "SurveyLadder",
    "white",
    "#7a2142",
    "📋"
  );
  private form: EnForm = EnForm.getInstance();

  constructor() {
    if (this.inIframe()) {
      this.runOnSurveyPage();
    } else {
      this.runOnParentPage();
    }
  }

  private runOnSurveyPage() {
    const questions = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".en__component--copyblock.survey-ladder-question"
      )
    );
    if (questions.length === 0) return; // Not the survey page
    if (ENGrid.getPageNumber() !== 1) return; // The survey's own thank-you page
    if (ENGrid.getBodyData("embedded") !== "thank-you-page-donation") {
      this.logger.log("Not embedded on a thank-you page");
      return;
    }

    const formBlocks = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".en__component--formblock.survey-ladder"
      )
    );
    if (questions.length !== formBlocks.length) {
      this.logger.error(
        `Found ${questions.length} questions and ${formBlocks.length} form blocks; each question needs one of each`
      );
      this.hideSurvey("Page structure doesn't match");
      return;
    }

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
      question.remove();
      formBlocks[index].remove();
    });

    const question = questions[current];
    const field = formBlocks[current].querySelector<HTMLInputElement>(
      'input[name^="supporter."]'
    );
    const list = question.querySelector("ul");
    const questionText = question.querySelector<HTMLElement>(
      "p:not(.survey-ladder-saved)"
    );
    if (!field || !list || !questionText) {
      this.logger.error("Question is missing its text, option list, or field");
      this.hideSurvey("Question structure doesn't match");
      return;
    }

    const { group, options } = this.renderOptions(list, questionText);
    const total = () =>
      options.reduce(
        (sum, option) => (option.checked ? sum + Number(option.value) : sum),
        0
      );

    options.forEach((option) =>
      option.addEventListener("change", () => {
        const sum = total();
        field.value = sum > 0 ? String(sum) : "";
        if (sum > 0) {
          ENGrid.removeError(group);
          this.resizeIframe();
        }
      })
    );

    this.form.onValidate.subscribe(() => {
      const sum = total();
      if (sum === 0) {
        ENGrid.setError(group, ERROR_MESSAGE);
        this.form.validate = false;
        this.resizeIframe();
        return;
      }
      field.value = String(sum);
    });

    this.form.onSubmit.subscribe(() => {
      window.parent.postMessage(
        { type: SUBMITTED_MESSAGE },
        window.location.origin
      );
    });

    this.logger.log(`Showing question ${current + 1} of ${questions.length}`);
    this.resizeIframe();
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

  private renderOptions(list: HTMLUListElement, questionText: HTMLElement) {
    questionText.id = "survey-ladder-question";

    // EN's checkbox markup, so the theme styles apply; no name, so nothing is posted
    const group = document.createElement("div");
    group.className = "en__field en__field--checkbox survey-ladder-options";
    const element = document.createElement("div");
    element.className = "en__field__element en__field__element--checkbox";
    element.setAttribute("role", "group");
    element.setAttribute("aria-labelledby", questionText.id);

    const options = Array.from(list.querySelectorAll("li")).map(
      (item, index) => {
        const id = `survey-ladder-option-${index}`;
        const wrapper = document.createElement("div");
        wrapper.className = "en__field__item";
        const option = document.createElement("input");
        option.type = "checkbox";
        option.id = id;
        option.className = "en__field__input en__field__input--checkbox";
        option.value = String(2 ** index); // 1, 2, 4, 8...
        const label = document.createElement("label");
        label.className = "en__field__label en__field__label--item";
        label.htmlFor = id;
        label.textContent = (item.textContent || "").trim();
        wrapper.append(option, label);
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

  // Answered: the supporter data merge tag rendered a total above 0
  private isAnswered(question: HTMLElement): boolean {
    const saved = question.querySelector(".survey-ladder-saved");
    return Number((saved?.textContent || "").trim()) > 0;
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
