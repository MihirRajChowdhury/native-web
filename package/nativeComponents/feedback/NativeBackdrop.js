import React from "react";
import { SCBackdrop } from "../../styledComponents/feedback/SCBackdrop";

export default function NativeBackdrop(props) {
  return <SCBackdrop {...props}>{props.children}</SCBackdrop>;
}
