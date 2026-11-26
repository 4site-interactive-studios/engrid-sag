/**
 * Survey Ladder: reading the questions on the survey page. Each question is a
 * Form Block with the class "survey-ladder" holding one Checkbox or Radio
 * custom field; its saved answer comes from a merge tag in the Text Block
 * with the class "survey-ladder-saved". Overview in index.ts
 */
import { configError, logger } from "./shared";

const SAVED_CLASS = "survey-ladder-saved";

export type MergeTagState = "rendered" | "raw" | "missing";

export interface SurveyQuestion {
  formBlock: HTMLElement;
  field: HTMLElement; // The .en__field wrapper, for errors
  fieldName: string; // e.g. supporter.NOT_TAGGED_20
  options: HTMLInputElement[];
  mergeTag: MergeTagState;
  saved: string[]; // Values from the merge tag
}

// Null for a broken block, which is logged and left out
export function readQuestion(formBlock: HTMLElement): SurveyQuestion | null {
  const options = Array.from(
    formBlock.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"][name^="supporter."], input[type="radio"][name^="supporter."]'
    )
  );
  const names = options
    .map((option) => option.name)
    .filter((name, index, all) => all.indexOf(name) === index);
  if (names.length !== 1) {
    configError(
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
    configError(`${fieldName} has no .en__field wrapper. Skipped`);
    return null;
  }

  labelGroup(field, key);

  const savedElement = document.querySelector(
    `.${SAVED_CLASS}--${CSS.escape(key)}`
  );
  const text = savedElement?.textContent || "";
  let mergeTag: MergeTagState = "rendered";
  if (!savedElement) {
    mergeTag = "missing";
    configError(
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
        ? parseSaved(text, options, options[0].type === "radio")
        : [],
  };
}

// For a known supporter, a raw merge tag is one EN didn't process (e.g. a typo
// in its syntax). A wrong field name renders empty and can't be told apart
export function reportRawMergeTags(questions: SurveyQuestion[]) {
  questions
    .filter((question) => question.mergeTag === "raw")
    .forEach((question) =>
      configError(
        `The merge tag for ${question.fieldName} didn't render (check its syntax). Skipped on thank-you pages`
      )
    );
}

// Answered: the merge tag has saved values, or EN pre-checked an option
export function isAnswered(question: SurveyQuestion): boolean {
  return (
    question.saved.length > 0 ||
    question.options.some((option) => option.checked)
  );
}

// Pre-checks the saved options when EN didn't (e.g. a ?chain redirect)
export function preselect(question: SurveyQuestion) {
  if (question.saved.length === 0) return;
  if (question.options.some((option) => option.checked)) return;
  question.options.forEach((option) => {
    option.checked = question.saved.indexOf(option.value) !== -1;
  });
  const unknown = question.saved.filter(
    (value) => !question.options.some((option) => option.value === value)
  );
  if (unknown.length > 0) {
    logger.log(
      `Saved values not in ${question.fieldName}'s options: ${unknown.join(
        " | "
      )}`
    );
  }
}

/**
 * Screen readers read the question with its options as one group. ENgrid's
 * A11y does this for Radio fields only; this does the same for Checkbox ones.
 */
function labelGroup(field: HTMLElement, key: string) {
  if (field.getAttribute("role") === "group") return;
  const label = field.querySelector<HTMLElement>(":scope > .en__field__label");
  if (!label) return;
  if (!label.id) label.id = `survey-ladder-label--${key}`;
  if (label.getAttribute("for") === "") label.removeAttribute("for");
  field.setAttribute("role", "group");
  field.setAttribute("aria-labelledby", label.id);
}

// EN joins the checked values of a Checkbox with commas. Matches the field's
// own options, longest first, so a value with a comma (e.g. "Yes, regularly")
// isn't split. A value no longer in the options (renamed or removed) runs up
// to the next comma. Radio saves a single value
function parseSaved(
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
