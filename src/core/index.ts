export type {
  Dispatch,
  Key,
  Renderer,
  UiAlgebra,
  UiOf
} from "./ui";

export {
  concatAssociativityLaw,
  concatEmptyLaw,
  concatLeftIdentityLaw,
  concatRightIdentityLaw,
  fragmentAssociativityLaw,
  fragmentIdentityLaw,
  mapEventCompositionLaw,
  mapEventIdentityLaw,
  mapEventPreservesConcatLaw,
  mapEventPreservesKeyedLaw
} from "./laws";

export type {
  HtmlAttribute,
  HtmlAttributeAny,
  HtmlTag
} from "./html";

export {
  attr,
  className,
  html,
  on,
  prop
} from "./html";
