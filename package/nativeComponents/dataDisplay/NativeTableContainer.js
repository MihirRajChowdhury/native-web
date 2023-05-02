import React from "react";
import { SCTableContainer } from "../../styledComponents/dataDisplay/SCTableContainer";

export default function NativeTableContainer(props) {
  return <SCTableContainer {...props}>{props.children}</SCTableContainer>;
}
