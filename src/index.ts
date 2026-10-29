import { Options, App } from "@4site/engrid-scripts"; // Uses ENGrid via NPM
// import { Options, App } from "../../engrid/packages/scripts"; // Uses ENGrid via Visual Studio Workspace

import "./sass/main.scss";
import { customScript } from "./scripts/main";
import { RememberMe, RememberMeOptions } from "./scripts/remember-me";

// The default Remember Me tooltip quotes the clear link, which has no name on a first visit
(window as any).EngridI18n = {
  en: {
    "rememberMe.tooltip":
      "Check “{label}” to complete forms on this device faster. While your financial information won’t be stored, you should only check this box from a personal device. Use the “Not [your name]?” link to remove the information from your device at any time.",
  },
};

// Saint Anthony's Guild runs its own copy of RememberMe (src/scripts/remember-me.ts)
// so data saved on one subdomain (give.) is available on the others (join.).
const rememberMeOptions: RememberMeOptions = {
  cookieName: "sag-remember-me",
  cookieExpirationDays: 365,
  checked: true,
  hide: false,
  fieldOptInSelectorTarget:
    "div.en__field--NOT_TAGGED_42, div.en__field--phoneNumber, div.en__field--postcode, div.en__field--emailAddress, div.en__field--lastName",
  fieldOptInSelectorTargetLocation: "after",
  fieldClearSelectorTarget:
    "div.en__field--firstName div, div.en__field--emailAddress div",
  fieldClearSelectorTargetLocation: "after",
  fieldNames: [
    "supporter.firstName",
    "supporter.lastName",
    "supporter.title",
    "supporter.emailAddress",
    "supporter.address1",
    "supporter.city",
    "supporter.country",
    "supporter.region",
    "supporter.postcode",
    "supporter.phoneNumber",
    "supporter.NOT_TAGGED_42", // Phone field on the main donation page
  ],
  fieldClearLabel: "{Not $username?}",
  // Write the cookie to the site's domain (stanthonysguild.org, etc.)
  cookieDomain: "auto",
};

// Same guard as ENgrid's App: accessing localStorage throws when storage is blocked
const startRememberMe = () => {
  try {
    if (window.localStorage) {
      new RememberMe(rememberMeOptions);
    }
  } catch (e) {}
};

const options: Options = {
  applePay: false,
  CapitalizeFields: true,
  ClickToExpand: true,
  CurrencySymbol: "$",
  DecimalSeparator: ".",
  ThousandsSeparator: ",",
  MediaAttribution: true,
  SkipToMainContentLink: true,
  SrcDefer: true,
  ProgressBar: true,
  Placeholders: {
    "input#en__field_supporter_NOT_TAGGED_42": "Phone Number (Optional)",
    "textarea#en__field_transaction_comments": "Your personal message",
    "input#en__field_supporter_bankAccountNumber": "Account Number",
  },
  // `true` instead of the options object: ENgrid's integrations that check this option
  // (DataLayer, FastFormFill, WelcomeBack, StickyPrepopulation) still see RememberMe as
  // enabled, but App only creates the core component for an object, so it skips it.
  // The SAG copy is started in onLoad below.
  RememberMe: true,
  Debug: App.getUrlParameter("debug") == "true" ? true : false,
  onLoad: () => {
    startRememberMe();
    customScript(App);
  },
  onResize: () => console.log("Starter Theme Window Resized"),
};
new App(options);
