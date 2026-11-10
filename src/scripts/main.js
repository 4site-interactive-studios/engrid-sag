import tippy from "tippy.js";

export const customScript = function (App) {
  console.log("ENGrid client scripts are executing");
  // Add your client scripts here

  // Add "what's this" markup to the CVV field
  const ccvvLabel = document.querySelector(".en__field--ccvv > label");
  if (ccvvLabel) {
    const el = document.createElement("span");
    const childEl = document.createElement("a");
    childEl.href = "#";
    childEl.id = "ccv-popcorn";
    childEl.className = "whats-this";
    childEl.tabIndex = "-1";
    childEl.innerText = "What's this?";
    childEl.addEventListener("click", (e) => e.preventDefault());
    el.appendChild(childEl);
    ccvvLabel.appendChild(el);
    tippy("#ccv-popcorn", {
      content:
        "The three or four digit security code on your debit or credit card",
    });
  }

  App.setBodyData("client-js-loading", "finished");
};
