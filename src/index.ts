import { Options, App } from "./engrid-common";
import "./sass/main.scss";
import "./scripts/main.js";

const options: Options = {
  ModalDebug: true,
  applePay: false,
  CapitalizeFields: true,
  ClickToExpand: true,
  CurrencySymbol: "$",
  CurrencySeparator: ".",
  MediaAttribution: true,
  SkipToMainContentLink: true,
  SrcDefer: true,
  onLoad: () => console.log("Starter Theme Loaded"),
  onResize: () => console.log("Starter Theme Window Resized"),
};
new App(options);
