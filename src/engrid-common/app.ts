import {
  DonationAmount,
  DonationFrequency,
  EnForm,
  ProcessingFees,
} from "./events";
import {
  Options,
  OptionsDefaults,
  MediaAttribution,
  ApplePay,
  CapitalizeFields,
  ClickToExpand,
  legacy,
  IE,
  LiveVariables,
  Modal,
  sendIframeHeight,
  ShowHideRadioCheckboxes,
  SimpleCountrySelect,
  SkipToMainContentLink,
  SrcDefer,
  VGS,
  ENGrid,
} from "./";

export class App extends ENGrid {
  // Events
  private _form: EnForm = EnForm.getInstance();
  private _fees: ProcessingFees = ProcessingFees.getInstance();
  private _amount: DonationAmount = DonationAmount.getInstance(
    "transaction.donationAmt",
    "transaction.donationAmt.other"
  );
  private _frequency: DonationFrequency = DonationFrequency.getInstance();

  private options: Options;

  constructor(options: Options) {
    super();
    this.options = { ...OptionsDefaults, ...options };
    // Document Load
    if (document.readyState !== "loading") {
      this.run();
    } else {
      document.addEventListener("DOMContentLoaded", () => {
        this.run();
      });
    }
    // Window Load
    window.onload = () => {
      this.onLoad();
    };
    // Window Resize
    window.onresize = () => {
      this.onResize();
    };
  }

  private run() {
    // IE Warning
    new IE();

    // TODO: Abstract everything to the App class so we can remove custom-methods
    legacy.setBackgroundImage();
    legacy.inputPlaceholder();
    legacy.watchInmemField();
    legacy.watchGiveBySelectField();
    legacy.SetEnFieldOtherAmountRadioStepValue();
    legacy.simpleUnsubscribe();

    legacy.contactDetailLabels();
    legacy.easyEdit();
    legacy.enInput.init();

    new ShowHideRadioCheckboxes("transaction.giveBySelect", "giveBySelect-");
    new ShowHideRadioCheckboxes("transaction.inmem", "inmem-");
    new ShowHideRadioCheckboxes("transaction.recurrpay", "recurrpay-");

    // Controls if the Theme has a the "Debug Bar"
    // legacy.debugBar();

    // Event Listener Examples
    this._amount.onAmountChange.subscribe((s) =>
      console.log(`Live Amount: ${s}`)
    );
    this._frequency.onFrequencyChange.subscribe((s) =>
      console.log(`Live Frequency: ${s}`)
    );
    this._form.onSubmit.subscribe((s) => console.log("Submit: ", s));
    this._form.onError.subscribe((s) => console.log("Error:", s));

    window.enOnSubmit = () => {
      this._form.submit = true;
      this._form.submitPromise = false;
      this._form.dispatchSubmit();
      if (!this._form.submit) return false;
      if (this._form.submitPromise) return this._form.submitPromise;
      // If all validation passes, we'll watch for Digital Wallets Errors, which
      // will not reload the page (thanks EN), so we will enable the submit button if
      // an error is programmatically thrown by the Digital Wallets
      return true;
    };
    window.enOnError = () => {
      this._form.dispatchError();
    };
    window.enOnValidate = () => {
      this._form.validate = true;
      this._form.validatePromise = false;
      this._form.dispatchValidate();
      if (!this._form.validate) return false;
      if (this._form.validatePromise) return this._form.validatePromise;
      return true;
    };

    // iFrame Logic
    this.loadIFrame();

    // Live Variables
    new LiveVariables(this.options);

    // Modal
    const modal = new Modal();
    modal.debug = this.options.ModalDebug; // Comment it out to disable debug

    // On the end of the script, after all subscribers defined, let's load the current value
    this._amount.load();
    this._frequency.load();

    // Simple Country Select
    new SimpleCountrySelect();
    // Add Image Attribution
    if (this.options.MediaAttribution) new MediaAttribution();
    // Apple Pay
    if (this.options.applePay) new ApplePay();
    // Capitalize Fields
    if (this.options.CapitalizeFields) new CapitalizeFields();
    // Click To Expand
    if (this.options.ClickToExpand) new ClickToExpand();
    if (this.options.SkipToMainContentLink) new SkipToMainContentLink();
    if (this.options.SrcDefer) new SrcDefer();
    new VGS();
  }

  private onLoad() {
    if (this.options.onLoad) {
      this.options.onLoad();
    }
    if (this.inIframe()) {
      // Scroll to top of iFrame
      console.log("iFrame Event - window.onload");
      sendIframeHeight();
      window.parent.postMessage(
        {
          scroll: this.shouldScroll(),
        },
        "*"
      );

      // On click fire the resize event
      document.addEventListener("click", (e: Event) => {
        console.log("iFrame Event - click");
        setTimeout(() => {
          sendIframeHeight();
        }, 100);
      });
    }
  }

  private onResize() {
    if (this.options.onResize) {
      this.options.onResize();
    }
    if (this.inIframe()) {
      console.log("iFrame Event - window.onload");
      sendIframeHeight();
    }
  }
  private inIframe() {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }
  private shouldScroll = () => {
    // If you find a error, scroll
    if (document.querySelector(".en__errorHeader")) {
      return true;
    }
    // Try to match the iframe referrer URL by testing valid EN Page URLs
    let referrer = document.referrer;
    let enURLPattern = new RegExp(/^(.*)\/(page)\/(\d+.*)/);

    // Scroll if the Regex matches, don't scroll otherwise
    return enURLPattern.test(referrer);
  };
  private loadIFrame() {
    if (this.inIframe()) {
      // Add the data-engrid-embedded attribute when inside an iFrame if it wasn't already added by a script in the Page Template
      document.body.setAttribute("data-engrid-embedded", "");
      // Fire the resize event
      console.log("iFrame Event - First Resize");
      sendIframeHeight();
    }
  }
}
