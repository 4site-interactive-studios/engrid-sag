declare global {
  interface Window {
    pageJson: any;
    enOnSubmit: any;
    enOnError: any;
    enOnValidate: any;
    EngagingNetworks: any;
    enVGSFields: any;
  }
}
export const body = document.body;
export const enGrid = document.getElementById("engrid") as HTMLElement;
export const enInput = (() => {
  /* @TODO */
  /************************************
   * Globablly Scoped Constants and Variables
   ***********************************/

  // @TODO Needs to be expanded to bind other EN elements (checkbox, radio) and compound elements (split-text, split-select, select with other input, etc...)
  // @TODO A "Not" condition is needed for #en__field_transaction_email because someone could name their email opt in "Email" and it will get the .en_field--email class generated for it
  // get DOM elements
  const init = () => {
    const formInput = document.querySelectorAll(
      ".en__field--text, .en__field--email:not(.en__field--checkbox), .en__field--telephone, .en__field--number, .en__field--textarea, .en__field--select, .en__field--checkbox"
    );
    const otherInputs = document.querySelectorAll(".en__field__input--other");
    Array.from(formInput).forEach((e) => {
      // @TODO Currently checkboxes always return as having a value, since they do but they're just not checked. Need to update and account for that, should also do Radio's while we're at it
      let element = e.querySelector("input, textarea, select") as
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement;
      if (element && element.value) {
        e.classList.add("has-value");
      }
      bindEvents(e);
    });

    /* @TODO Review Engaging Networks to see if this is still needed */
    /************************************
     * Automatically select other radio input when an amount is entered into it.
     ***********************************/
    Array.from(otherInputs).forEach((e) => {
      ["focus", "input"].forEach((evt) => {
        e.addEventListener(
          evt,
          (ev) => {
            const target = ev.target as HTMLInputElement;
            if (target && target.parentNode && target.parentNode.parentNode) {
              const targetWrapper = target.parentNode as HTMLElement;
              targetWrapper.classList.remove("en__field__item--hidden");
              if (targetWrapper.parentNode) {
                const lastRadioInput = targetWrapper.parentNode.querySelector(
                  ".en__field__item:nth-last-child(2) input"
                ) as HTMLInputElement;
                lastRadioInput.checked = !0;
              }
            }
          },
          false
        );
      });
    });
  };

  return {
    init: init,
  };
})();

export const setBackgroundImage = () => {
  // Finds any <img> added to the "backgroundImage" ENGRid section and sets it as the "--theme-page-backgroundImage-url" CSS Custom Property
  const root = document.documentElement;
  const pageBackground = document.querySelector(
    ".page-backgroundImage"
  ) as HTMLElement;
  const pageBackgroundImg = document.querySelector(
    ".page-backgroundImage img"
  ) as HTMLImageElement;
  let pageBackgroundImgDataSrc = pageBackgroundImg?.getAttribute(
    "data-src"
  ) as string;
  let pageBackgroundImgSrc = pageBackgroundImg?.src as string;

  if (pageBackground && pageBackgroundImgDataSrc) {
    console.log(
      "A background image set in the page was found with a data-src value, setting it as --theme-page-backgroundImage-url",
      pageBackgroundImgDataSrc
    );
    pageBackgroundImgDataSrc = "url('" + pageBackgroundImgDataSrc + "')";
    pageBackground.style.setProperty(
      "--theme-page-backgroundImage-url",
      pageBackgroundImgDataSrc
    );
    document
      .getElementsByTagName("BODY")[0]
      .setAttribute("data-engrid-backgroundImage", "set");
  } else if (pageBackground && pageBackgroundImgSrc) {
    console.log(
      "A background image set in the page was found with a src value, setting it as --theme-page-backgroundImage-url",
      pageBackgroundImgSrc
    );
    pageBackgroundImgSrc = "url('" + pageBackgroundImgSrc + "')";
    pageBackground.style.setProperty(
      "--theme-page-backgroundImage-url",
      pageBackgroundImgSrc
    );
    document
      .getElementsByTagName("BODY")[0]
      .setAttribute("data-engrid-backgroundImage", "set");
  } else if (pageBackgroundImg) {
    console.log(
      "A background image set in the page was found but without a data-src or src value, no action taken",
      pageBackgroundImg
    );
  } else {
    console.log(
      "A background image set in the page was not found, any default image set in the theme on --theme-page-backgroundImage-url will be used"
    );
  }
};

export const bindEvents = (e: Element) => {
  /* @TODO */
  /************************************
   * INPUT, TEXTAREA, AND SELECT ACTIVITY CLASSES (FOCUS AND BLUR)
   * NOTE: STILL NEEDS WORK TO FUNCTION ON "SPLIT" CUSTOM EN FIELDS
   * REF: https://developer.mozilla.org/en-US/docs/Web/API/Element/blur_event
   ***********************************/

  // Occurs when an input field gets focus
  const handleFocus = (e: Event) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    if (target && target.parentNode && target.parentNode.parentNode) {
      const targetWrapper = target.parentNode.parentNode as HTMLElement;
      targetWrapper.classList.add("has-focus");
    }
  };

  // Occurs when a user leaves an input field
  const handleBlur = (e: Event) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    if (target && target.parentNode && target.parentNode.parentNode) {
      const targetWrapper = target.parentNode.parentNode as HTMLElement;
      targetWrapper.classList.remove("has-focus");
      if (target.value) {
        targetWrapper.classList.add("has-value");
      } else {
        targetWrapper.classList.remove("has-value");
      }
    }
  };

  // Occurs when a user changes the selected option of a <select> element
  const handleChange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    if (target && target.parentNode && target.parentNode.parentNode) {
      const targetWrapper = target.parentNode.parentNode as HTMLElement;
      targetWrapper.classList.add("has-value");
    }
  };

  // Occurs when a text or textarea element gets user input
  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    if (target && target.parentNode && target.parentNode.parentNode) {
      const targetWrapper = target.parentNode.parentNode as HTMLElement;
      targetWrapper.classList.add("has-value");
    }
  };

  // Occurs when the web browser autofills a form fields
  // REF: engrid-autofill.scss
  // REF: https://medium.com/@brunn/detecting-autofilled-fields-in-javascript-aed598d25da7
  const onAutoFillStart = (e: any) => {
    e.parentNode.parentNode.classList.add("is-autofilled", "has-value");
  };

  const onAutoFillCancel = (e: any) =>
    e.parentNode.parentNode.classList.remove("is-autofilled", "has-value");
  const onAnimationStart = (e: any) => {
    const target = e.target as HTMLElement;
    const animation = e.animationName;
    switch (animation) {
      case "onAutoFillStart":
        return onAutoFillStart(target);
      case "onAutoFillCancel":
        return onAutoFillCancel(target);
    }
  };

  const enField = e.querySelector("input, textarea, select") as
    | HTMLInputElement
    | HTMLTextAreaElement
    | HTMLSelectElement;
  if (enField) {
    enField.addEventListener("focus", handleFocus);
    enField.addEventListener("blur", handleBlur);
    enField.addEventListener("change", handleChange);
    enField.addEventListener("input", handleInput);
    enField.addEventListener("animationstart", onAnimationStart);
  }
};

export const removeClassesByPrefix = (el: HTMLElement, prefix: string) => {
  for (var i = el.classList.length - 1; i >= 0; i--) {
    if (el.classList[i].startsWith(prefix)) {
      el.classList.remove(el.classList[i]);
    }
  }
};

export const debugBar = () => {
  if (
    window.location.href.indexOf("debug") != -1 ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1"
  ) {
    body.classList.add("debug");
    if (enGrid) {
      enGrid.insertAdjacentHTML(
        "beforebegin",
        '<span id="debug-bar">' +
          '<span id="info-wrapper">' +
          "<span>DEBUG BAR</span>" +
          "</span>" +
          '<span id="buttons-wrapper">' +
          '<span id="debug-close">X</span>' +
          "</span>" +
          "</span>"
      );
    }

    if (window.location.search.indexOf("mode=DEMO") > -1) {
      const infoWrapper = document.getElementById("info-wrapper");
      const buttonsWrapper = document.getElementById("buttons-wrapper");

      if (infoWrapper) {
        // console.log(window.performance);
        const now = new Date().getTime();
        const initialPageLoad =
          (now - performance.timing.navigationStart) / 1000;
        const domInteractive =
          initialPageLoad + (now - performance.timing.domInteractive) / 1000;

        infoWrapper.insertAdjacentHTML(
          "beforeend",
          "<span>Initial Load: " +
            initialPageLoad +
            "s</span>" +
            "<span>DOM Interactive: " +
            domInteractive +
            "s</span>"
        );

        if (buttonsWrapper) {
          buttonsWrapper.insertAdjacentHTML(
            "afterbegin",
            '<button id="layout-toggle" type="button">Layout Toggle</button>' +
              '<button id="page-edit" type="button">Edit in PageBuilder (BETA)</button>'
          );
        }
      }
    }

    if (
      window.location.href.indexOf("debug") != -1 ||
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1"
    ) {
      const buttonsWrapper = document.getElementById("buttons-wrapper");
      if (buttonsWrapper) {
        buttonsWrapper.insertAdjacentHTML(
          "afterbegin",
          '<button id="layout-toggle" type="button">Layout Toggle</button>' +
            '<button id="fancy-errors-toggle" type="button">Toggle Fancy Errors</button>'
        );
      }
    }

    if (document.getElementById("fancy-errors-toggle")) {
      const debugTemplateButton = document.getElementById(
        "fancy-errors-toggle"
      );
      if (debugTemplateButton) {
        debugTemplateButton.addEventListener(
          "click",
          function () {
            fancyErrorsToggle();
          },
          false
        );
      }
    }

    if (document.getElementById("layout-toggle")) {
      const debugTemplateButton = document.getElementById("layout-toggle");
      if (debugTemplateButton) {
        debugTemplateButton.addEventListener(
          "click",
          function () {
            layoutToggle();
          },
          false
        );
      }
    }

    if (document.getElementById("page-edit")) {
      const debugTemplateButton = document.getElementById("page-edit");
      if (debugTemplateButton) {
        debugTemplateButton.addEventListener(
          "click",
          function () {
            pageEdit();
          },
          false
        );
      }
    }

    if (document.getElementById("debug-close")) {
      const debugTemplateButton = document.getElementById("debug-close");
      if (debugTemplateButton) {
        debugTemplateButton.addEventListener(
          "click",
          function () {
            debugClose();
          },
          false
        );
      }
    }

    const fancyErrorsToggle = () => {
      if (enGrid) {
        enGrid.classList.toggle("fancy-errors");
      }
    };

    const pageEdit = () => {
      window.location.href = window.location.href + "?edit";
    };

    const layoutToggle = () => {
      if (enGrid) {
        if (enGrid.classList.contains("layout-centercenter1col")) {
          removeClassesByPrefix(enGrid, "layout-");
          enGrid.classList.add("layout-centercenter1col-wide");
        } else if (enGrid.classList.contains("layout-centercenter1col-wide")) {
          removeClassesByPrefix(enGrid, "layout-");
          enGrid.classList.add("layout-centerright1col");
        } else if (enGrid.classList.contains("layout-centerright1col")) {
          removeClassesByPrefix(enGrid, "layout-");
          enGrid.classList.add("layout-centerleft1col");
        } else if (enGrid.classList.contains("layout-centerleft1col")) {
          removeClassesByPrefix(enGrid, "layout-");
          enGrid.classList.add("layout-embedded");
        } else if (enGrid.classList.contains("layout-embedded")) {
          removeClassesByPrefix(enGrid, "layout-");
          enGrid.classList.add("layout-centercenter1col");
        } else {
          console.log(
            "While trying to switch layouts, something unexpected happen."
          );
        }
      }
    };

    const debugClose = () => {
      body.classList.remove("debug");
      const debugBar = document.getElementById("debug-bar");
      if (debugBar) {
        debugBar.style.display = "none";
      }
    };
  }
};

export const inputPlaceholder = () => {
  // FIND ALL COMMON INPUT FIELDS
  let enFieldDonationAmt = document.querySelector(
    ".en__field--donationAmt.en__field--withOther .en__field__input--other"
  ) as HTMLInputElement;
  let enFieldFirstName = document.querySelector(
    "input#en__field_supporter_firstName"
  ) as HTMLInputElement;
  let enFieldLastName = document.querySelector(
    "input#en__field_supporter_lastName"
  ) as HTMLInputElement;
  let enFieldEmailAddress = document.querySelector(
    "input#en__field_supporter_emailAddress"
  ) as HTMLInputElement;
  let enFieldPhoneNumber = document.querySelector(
    "#inputen__field_supporter_phoneNumber"
  ) as HTMLInputElement;
  let enFieldPhoneNumber2 = document.querySelector(
    "input#en__field_supporter_phoneNumber2"
  ) as HTMLInputElement;
  let enFieldCountry = document.querySelector(
    "input#en__field_supporter_country"
  ) as HTMLInputElement;
  let enFieldAddress1 = document.querySelector(
    "input#en__field_supporter_address1"
  ) as HTMLInputElement;
  let enFieldAddress2 = document.querySelector(
    "input#en__field_supporter_address2"
  ) as HTMLInputElement;
  let enFieldCity = document.querySelector(
    "input#en__field_supporter_city"
  ) as HTMLInputElement;
  // let enFieldRegion = document.querySelector("input#en__field_supporter_region") as HTMLInputElement
  let enFieldPostcode = document.querySelector(
    "input#en__field_supporter_postcode"
  ) as HTMLInputElement;
  let enFieldHonname = document.querySelector(
    "input#en__field_transaction_honname"
  ) as HTMLInputElement;
  let enFieldInfname = document.querySelector(
    "input#en__field_transaction_infname"
  ) as HTMLInputElement;
  let enFieldInfemail = document.querySelector(
    "input#en__field_transaction_infemail"
  ) as HTMLInputElement;
  let enFieldInfcountry = document.querySelector(
    "input#en__field_transaction_infcountry"
  ) as HTMLInputElement;
  let enFieldInfadd1 = document.querySelector(
    "input#en__field_transaction_infadd1"
  ) as HTMLInputElement;
  let enFieldInfadd2 = document.querySelector(
    "input#en__field_transaction_infadd2"
  ) as HTMLInputElement;
  let enFieldInfcity = document.querySelector(
    "input#en__field_transaction_infcity"
  ) as HTMLInputElement;
  let enFieldInfpostcd = document.querySelector(
    "input#en__field_transaction_infpostcd"
  ) as HTMLInputElement;
  let enFieldGftrsn = document.querySelector(
    "input#en__field_transaction_gftrsn"
  ) as HTMLInputElement;
  let enFieldCcnumber = document.querySelector(
    "input#en__field_transaction_ccnumber"
  ) as HTMLInputElement;
  let enFieldCcexpire = document.querySelector(
    "input#en__field_transaction_ccexpire"
  ) as HTMLInputElement;
  let enFieldCcvv = document.querySelector(
    "input#en__field_transaction_ccvv"
  ) as HTMLInputElement;
  let enFieldBankAccountNumber = document.querySelector(
    "input#en__field_supporter_bankAccountNumber"
  ) as HTMLInputElement;
  let enFieldBankRoutingNumber = document.querySelector(
    "input#en__field_supporter_bankRoutingNumber"
  ) as HTMLInputElement;

  // CHANGE FIELD INPUT TYPES
  if (enFieldDonationAmt) {
    enFieldDonationAmt.setAttribute("inputmode", "numeric");
  }

  // ADD FIELD PLACEHOLDERS
  const enAddInputPlaceholder = document.querySelector(
    "[data-engrid-add-input-placeholders]"
  ) as HTMLDataElement;

  if (enAddInputPlaceholder && enFieldDonationAmt) {
    enFieldDonationAmt.placeholder = "Other";
  }
  if (enAddInputPlaceholder && enFieldFirstName) {
    enFieldFirstName.placeholder = "First name";
  }
  if (enAddInputPlaceholder && enFieldLastName) {
    enFieldLastName.placeholder = "Last name";
  }
  if (enAddInputPlaceholder && enFieldEmailAddress) {
    enFieldEmailAddress.placeholder = "Email address";
  }
  if (enAddInputPlaceholder && enFieldPhoneNumber) {
    enFieldPhoneNumber.placeholder = "Phone number";
  }
  if (enAddInputPlaceholder && enFieldPhoneNumber2) {
    enFieldPhoneNumber2.placeholder = "000-000-0000 (optional)";
  }
  if (enAddInputPlaceholder && enFieldCountry) {
    enFieldCountry.placeholder = "Country";
  }
  if (enAddInputPlaceholder && enFieldAddress1) {
    enFieldAddress1.placeholder = "Street address";
  }
  if (enAddInputPlaceholder && enFieldAddress2) {
    enFieldAddress2.placeholder = "Apt., ste., bldg.";
  }
  if (enAddInputPlaceholder && enFieldCity) {
    enFieldCity.placeholder = "City";
  }
  // if (enAddInputPlaceholder && enFieldRegion){enFieldRegion.placeholder = "TBD";}
  if (enAddInputPlaceholder && enFieldPostcode) {
    enFieldPostcode.placeholder = "Post code";
  }
  if (enAddInputPlaceholder && enFieldHonname) {
    enFieldHonname.placeholder = "Honoree name";
  }
  if (enAddInputPlaceholder && enFieldInfname) {
    enFieldInfname.placeholder = "Recipient name";
  }
  if (enAddInputPlaceholder && enFieldInfemail) {
    enFieldInfemail.placeholder = "Recipient email address";
  }
  if (enAddInputPlaceholder && enFieldInfcountry) {
    enFieldInfcountry.placeholder = "TBD";
  }
  if (enAddInputPlaceholder && enFieldInfadd1) {
    enFieldInfadd1.placeholder = "Recipient street address";
  }
  if (enAddInputPlaceholder && enFieldInfadd2) {
    enFieldInfadd2.placeholder = "Recipient Apt., ste., bldg.";
  }
  if (enAddInputPlaceholder && enFieldInfcity) {
    enFieldInfcity.placeholder = "Recipient city";
  }
  if (enAddInputPlaceholder && enFieldInfpostcd) {
    enFieldInfpostcd.placeholder = "Recipient postal code";
  }
  if (enAddInputPlaceholder && enFieldGftrsn) {
    enFieldGftrsn.placeholder = "Reason for your gift";
  }
  if (enAddInputPlaceholder && enFieldCcnumber) {
    enFieldCcnumber.placeholder = "•••• •••• •••• ••••";
  }
  if (enAddInputPlaceholder && enFieldCcexpire) {
    enFieldCcexpire.placeholder = "MM / YY";
  }
  if (enAddInputPlaceholder && enFieldCcvv) {
    enFieldCcvv.placeholder = "CVV";
  }
  if (enAddInputPlaceholder && enFieldBankAccountNumber) {
    enFieldBankAccountNumber.placeholder = "Bank account number";
  }
  if (enAddInputPlaceholder && enFieldBankRoutingNumber) {
    enFieldBankRoutingNumber.placeholder = "Bank routing number";
  }
};

export const watchInmemField = () => {
  const enFieldTransactionInmem = document.getElementById(
    "en__field_transaction_inmem"
  ) as HTMLInputElement;

  const handleEnFieldTransactionInmemChange = (e: Event) => {
    if (enGrid) {
      if (enFieldTransactionInmem.checked) {
        enGrid.classList.add("has-give-in-honor");
      } else {
        enGrid.classList.remove("has-give-in-honor");
      }
    }
  };

  // Check Give In Honor State on Page Load
  if (enFieldTransactionInmem && enGrid) {
    // Run on page load
    if (enFieldTransactionInmem.checked) {
      enGrid.classList.add("has-give-in-honor");
    } else {
      enGrid.classList.remove("has-give-in-honor");
    }

    // Run on change
    enFieldTransactionInmem.addEventListener(
      "change",
      handleEnFieldTransactionInmemChange
    );
  }
};

// @TODO Refactor (low priority)
export const watchGiveBySelectField = () => {
  const enFieldGiveBySelect = document.querySelector(
    ".en__field--giveBySelect"
  ) as HTMLElement;
  const transactionGiveBySelect = document.getElementsByName(
    "transaction.giveBySelect"
  ) as NodeList;
  const enFieldPaymentType = document.querySelector(
    "#en__field_transaction_paymenttype"
  ) as HTMLSelectElement;
  let enFieldGiveBySelectCurrentValue = document.querySelector(
    'input[name="transaction.giveBySelect"]:checked'
  ) as HTMLInputElement;
  const prefix = "has-give-by-";

  const handleEnFieldGiveBySelect = (e: Event) => {
    enFieldGiveBySelectCurrentValue = document.querySelector(
      'input[name="transaction.giveBySelect"]:checked'
    ) as HTMLInputElement;
    console.log(
      "enFieldGiveBySelectCurrentValue:",
      enFieldGiveBySelectCurrentValue
    );
    if (
      enFieldGiveBySelectCurrentValue &&
      enFieldGiveBySelectCurrentValue.value.toLowerCase() == "card"
    ) {
      if (enGrid) {
        removeClassesByPrefix(enGrid, prefix);
        enGrid.classList.add("has-give-by-card");
      }
      // enFieldPaymentType.value = "card";
      handleCCUpdate();
    } else if (
      enFieldGiveBySelectCurrentValue &&
      enFieldGiveBySelectCurrentValue.value.toLowerCase() == "check"
    ) {
      if (enGrid) {
        removeClassesByPrefix(enGrid, prefix);
        enGrid.classList.add("has-give-by-check");
      }
      enFieldPaymentType.value = "check";
    } else if (
      enFieldGiveBySelectCurrentValue &&
      enFieldGiveBySelectCurrentValue.value.toLowerCase() == "paypal"
    ) {
      if (enGrid) {
        removeClassesByPrefix(enGrid, prefix);
        enGrid.classList.add("has-give-by-paypal");
      }
      enFieldPaymentType.value = "paypal";
    } else if (
      enFieldGiveBySelectCurrentValue &&
      enFieldGiveBySelectCurrentValue.value.toLowerCase() == "applepay"
    ) {
      if (enGrid) {
        removeClassesByPrefix(enGrid, prefix);
        enGrid.classList.add("has-give-by-applepay");
      }
      enFieldPaymentType.value = "applepay";
    }
  };

  // Check Giving Frequency on page load
  if (enFieldGiveBySelect) {
    enFieldGiveBySelectCurrentValue = document.querySelector(
      'input[name="transaction.giveBySelect"]:checked'
    ) as HTMLInputElement;
    if (
      enFieldGiveBySelectCurrentValue &&
      enFieldGiveBySelectCurrentValue.value.toLowerCase() == "card"
    ) {
      if (enGrid) {
        removeClassesByPrefix(enGrid, prefix);
        enGrid.classList.add("has-give-by-card");
      }
      // enFieldPaymentType.value = "card";
      handleCCUpdate();
    } else if (
      enFieldGiveBySelectCurrentValue &&
      enFieldGiveBySelectCurrentValue.value.toLowerCase() == "check"
    ) {
      if (enGrid) {
        removeClassesByPrefix(enGrid, prefix);
        enGrid.classList.add("has-give-by-check");
      }
      enFieldPaymentType.value = "check";
      enFieldPaymentType.value = "Check";
    } else if (
      enFieldGiveBySelectCurrentValue &&
      enFieldGiveBySelectCurrentValue.value.toLowerCase() == "paypal"
    ) {
      if (enGrid) {
        removeClassesByPrefix(enGrid, prefix);
        enGrid.classList.add("has-give-by-paypal");
      }
      enFieldPaymentType.value = "paypal";
      enFieldPaymentType.value = "Paypal";
    } else if (
      enFieldGiveBySelectCurrentValue &&
      enFieldGiveBySelectCurrentValue.value.toLowerCase() == "applepay"
    ) {
      if (enGrid) {
        removeClassesByPrefix(enGrid, prefix);
        enGrid.classList.add("has-give-by-applepay");
      }
      enFieldPaymentType.value = "applepay";
    }
  }

  // Watch each Giving Frequency radio input for a change
  if (transactionGiveBySelect) {
    Array.from(transactionGiveBySelect).forEach((e) => {
      let element = e as HTMLInputElement;
      element.addEventListener("change", handleEnFieldGiveBySelect);
    });
  }
};

/*
 * Input fields as reference variables
 */
const field_credit_card = document.querySelector(
  "input#en__field_transaction_ccnumber"
) as HTMLInputElement;
const field_payment_type = document.getElementById(
  "en__field_transaction_paymenttype"
) as HTMLSelectElement;
let field_expiration_parts = document.querySelectorAll(
  ".en__field--ccexpire .en__field__input--splitselect"
);
const field_country = document.getElementById(
  "en__field_supporter_country"
) as HTMLInputElement;
let field_expiration_month = field_expiration_parts[0] as HTMLSelectElement;
let field_expiration_year = field_expiration_parts[1] as HTMLSelectElement;

/* The Donation Other Giving Amount is a "Number" type input field. This restricts valid inputs to integers unless a step value is defined. Be defining a step value of .01 any valid 2 digit decimal can be entered */
export const SetEnFieldOtherAmountRadioStepValue = () => {
  const enFieldOtherAmountRadio = document.querySelector(
    ".en__field--donationAmt .en__field__input--other"
  ) as HTMLInputElement;
  if (enFieldOtherAmountRadio) {
    enFieldOtherAmountRadio.setAttribute("step", ".01");
  }
};

/*
 * Helpers
 */

// current_month and current_year used by handleExpUpdate()
let d = new Date();
var current_month = d.getMonth() + 1; // month options in expiration dropdown are indexed from 1
var current_year = d.getFullYear() - 2000;

// getCardType used by handleCCUpdate()
const getCardType = (cc_partial: string) => {
  let key_character = cc_partial.charAt(0);
  const prefix = "live-card-type-";
  const field_credit_card_classes = field_credit_card.className
    .split(" ")
    .filter((c) => !c.startsWith(prefix));

  switch (key_character) {
    case "0":
      field_credit_card.className = field_credit_card_classes.join(" ").trim();
      field_credit_card.classList.add("live-card-type-invalid");
      return false;
    case "1":
      field_credit_card.className = field_credit_card_classes.join(" ").trim();
      field_credit_card.classList.add("live-card-type-invalid");
      return false;
    case "2":
      field_credit_card.className = field_credit_card_classes.join(" ").trim();
      field_credit_card.classList.add("live-card-type-invalid");
      return false;
    case "3":
      field_credit_card.className = field_credit_card_classes.join(" ").trim();
      field_credit_card.classList.add("live-card-type-amex");
      return "amex";
    case "4":
      field_credit_card.className = field_credit_card_classes.join(" ").trim();
      field_credit_card.classList.add("live-card-type-visa");
      return "visa";
    case "5":
      field_credit_card.className = field_credit_card_classes.join(" ").trim();
      field_credit_card.classList.add("live-card-type-mastercard");
      return "mastercard";
    case "6":
      field_credit_card.className = field_credit_card_classes.join(" ").trim();
      field_credit_card.classList.add("live-card-type-discover");
      return "discover";
    case "7":
      field_credit_card.className = field_credit_card_classes.join(" ").trim();
      field_credit_card.classList.add("live-card-type-invalid");
      return false;
    case "8":
      field_credit_card.className = field_credit_card_classes.join(" ").trim();
      field_credit_card.classList.add("live-card-type-invalid");
      return false;
    case "9":
      field_credit_card.className = field_credit_card_classes.join(" ").trim();
      field_credit_card.classList.add("live-card-type-invalid");
      return false;
    default:
      field_credit_card.className = field_credit_card_classes.join(" ").trim();
      field_credit_card.classList.add("live-card-type-na");
      return false;
  }
};

/*
 * Handlers
 */
const handleCCUpdate = () => {
  if (!field_credit_card) return;
  const card_type = getCardType(field_credit_card.value);
  const card_values = {
    amex: ["amex", "american express", "americanexpress", "amx", "ax"],
    visa: ["visa", "vi"],
    mastercard: ["mastercard", "master card", "mc"],
    discover: ["discover", "di"],
  };
  const payment_text =
    field_payment_type.options[field_payment_type.selectedIndex].text;

  if (card_type && payment_text != card_type) {
    field_payment_type.value = Array.from(field_payment_type.options).filter(
      (d) => card_values[card_type].includes(d.value.toLowerCase())
    )[0].value;
    if (
      window.EngagingNetworks &&
      typeof window.EngagingNetworks?.require?._defined?.enDependencies
        ?.dependencies?.parseDependencies === "function"
    ) {
      window.EngagingNetworks.require._defined.enDependencies.dependencies.parseDependencies(
        window.EngagingNetworks.dependencies
      );
    }
  }
};

const handleExpUpdate = (e: string) => {
  // handle if year is changed to current year (disable all months less than current month)
  // handle if month is changed to less than current month (disable current year)
  if (e == "month") {
    let selected_month = parseInt(field_expiration_month.value);
    let disable = selected_month < current_month;
    console.log(
      "month disable",
      disable,
      typeof disable,
      selected_month,
      current_month
    );
    for (let i = 0; i < field_expiration_year.options.length; i++) {
      // disable or enable current year
      if (parseInt(field_expiration_year.options[i].value) <= current_year) {
        if (disable) {
          //@TODO Couldn't get working in TypeScript
          field_expiration_year.options[i].setAttribute("disabled", "disabled");
        } else {
          field_expiration_year.options[i].disabled = false;
        }
      }
    }
  } else if (e == "year") {
    let selected_year = parseInt(field_expiration_year.value);
    let disable = selected_year == current_year;
    console.log(
      "year disable",
      disable,
      typeof disable,
      selected_year,
      current_year
    );
    for (let i = 0; i < field_expiration_month.options.length; i++) {
      // disable or enable all months less than current month
      if (parseInt(field_expiration_month.options[i].value) < current_month) {
        if (disable) {
          //@TODO Couldn't get working in TypeScript
          field_expiration_month.options[i].setAttribute(
            "disabled",
            "disabled"
          );
        } else {
          field_expiration_month.options[i].disabled = false;
        }
      }
    }
  }
};

/*
 * Event Listeners
 */
if (field_credit_card) {
  field_credit_card.addEventListener("keyup", function () {
    handleCCUpdate();
  });
  field_credit_card.addEventListener("paste", function () {
    handleCCUpdate();
  });
  field_credit_card.addEventListener("blur", function () {
    handleCCUpdate();
  });
}

if (field_expiration_month && field_expiration_year) {
  field_expiration_month.addEventListener("change", function () {
    handleExpUpdate("month");
  });

  field_expiration_year.addEventListener("change", function () {
    handleExpUpdate("year");
  });
}

// EN Polyfill to support "label" clicking on Advocacy Recipient "labels"
export const contactDetailLabels = () => {
  const contact = document.querySelectorAll(
    ".en__contactDetails__rows"
  ) as NodeList;

  // @TODO Needs refactoring. Has to be a better way to do this.
  const recipientChange = (e: Event) => {
    let recipientRow = e.target as HTMLDivElement;
    // console.log("recipientChange: recipientRow: ", recipientRow);
    let recipientRowWrapper = recipientRow.parentNode as HTMLDivElement;
    // console.log("recipientChange: recipientRowWrapper: ", recipientRowWrapper);
    let recipientRowsWrapper = recipientRowWrapper.parentNode as HTMLDivElement;
    // console.log("recipientChange: recipientRowsWrapper: ", recipientRowsWrapper);
    let contactDetails = recipientRowsWrapper.parentNode as HTMLDivElement;
    // console.log("recipientChange: contactDetails: ", contactDetails);
    let contactDetailsCheckbox = contactDetails.querySelector(
      "input"
    ) as HTMLInputElement;
    // console.log("recipientChange: contactDetailsCheckbox: ", contactDetailsCheckbox);
    if (contactDetailsCheckbox.checked) {
      contactDetailsCheckbox.checked = false;
    } else {
      contactDetailsCheckbox.checked = true;
    }
  };

  if (contact) {
    Array.from(contact).forEach((e) => {
      let element = e as HTMLDivElement;
      element.addEventListener("click", recipientChange);
    });
  }
};

// @TODO Adds a URL path "/edit" that can be used to easily arrive at the editable version of the current page. Should automatically detect if the client is using us.e-activist or e-activist and adjust accoridngly. Should also pass in page number and work for all page types without each needing to be specified.
// @TODO Remove hard coded client values
export const easyEdit = () => {
  const liveURL = window.location.href as string;
  let editURL = "" as string;
  if (liveURL.search("edit") !== -1) {
    if (liveURL.includes("https://act.ran.org/page/")) {
      editURL = liveURL.replace(
        "https://act.ran.org/page/",
        "https://us.e-activist.com/index.html#pages/"
      );
      editURL = editURL.replace("/donate/1", "/edit");
      editURL = editURL.replace("/action/1", "/edit");
      editURL = editURL.replace("/data/1", "/edit");
      window.location.href = editURL;
    }
  }
};

// If you go to and Engaging Networks Unsubscribe page anonymously
// then the fields are in their default states. If you go to it via an email
// link that authenticates who you are, it then populates the fields with corresponding
// values from your account. This means to unsubscribe the user has to uncheck the
// newsletter checkbox(s) before submitting.

export const simpleUnsubscribe = () => {
  // console.log("simpleUnsubscribe fired");

  // Check if we're on an Unsubscribe / Manage Subscriptions page
  if (window.location.href.indexOf("/subscriptions") != -1) {
    // console.log("On an subscription management page");

    // Check if any form elements on this page have the "forceUncheck" class
    const forceUncheck = document.querySelectorAll(".forceUncheck");
    if (forceUncheck) {
      // console.log("Found forceUnchecl dom elements", forceUncheck);

      // Step through each DOM element with forceUncheck looking for checkboxes
      Array.from(forceUncheck).forEach((e) => {
        let element = e as HTMLElement;
        // console.log("Checking this formComponent for checkboxes", element);

        // In the forceUncheck form component, find any checboxes
        let uncheckCheckbox = element.querySelectorAll(
          "input[type='checkbox']"
        );
        if (uncheckCheckbox) {
          // Step through each Checkbox in the forceUncheck form component
          Array.from(uncheckCheckbox).forEach((f) => {
            let checkbox = f as HTMLInputElement;
            // console.log("Unchecking this checkbox", checkbox);
            // Uncheck the checbox
            checkbox.checked = false;
          });
        }
      });
    }
  }
};

// Watch the Region Field for changes. If there is only one option, hide it.
// @TODO Should this be expanded where if a select only has one option it's always hidden?
const country_select = document.getElementById(
  "en__field_supporter_country"
) as HTMLSelectElement;
const region_select = document.getElementById(
  "en__field_supporter_region"
) as HTMLSelectElement;
if (country_select) {
  country_select.addEventListener("change", () => {
    setTimeout(() => {
      if (
        region_select.options.length == 1 &&
        region_select.options[0].value == "other"
      ) {
        region_select.classList.add("hide");
      } else {
        region_select.classList.remove("hide");
      }
    }, 100);
  });
}

// @TODO "Footer in Viewport Check" should be made its own TS file
const contentFooter = document.querySelector(".content-footer");

/*!
 * Determine if an element is in the viewport
 * (c) 2017 Chris Ferdinandi, MIT License, https://gomakethings.com
 * @param  {Node}    elem The element
 * @return {Boolean}      Returns true if element is in the viewport
 */
const isInViewport = (e: any) => {
  const distance = e.getBoundingClientRect();
  // console.log("Footer: ", distance);
  return (
    distance.top >= 0 &&
    distance.left >= 0 &&
    distance.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    distance.right <=
      (window.innerWidth || document.documentElement.clientWidth)
  );
};

// Checks to see if the page is so short, the footer is above the fold. If the footer is above the folde we'll use this class to ensure at a minimum the page fills the full viewport height.
if (contentFooter && isInViewport(contentFooter)) {
  document
    .getElementsByTagName("BODY")[0]
    .setAttribute("data-engrid-footer-above-fold", "");
} else {
  document
    .getElementsByTagName("BODY")[0]
    .setAttribute("data-engrid-footer-below-fold", "");
}
