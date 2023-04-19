import React from "react";

import { useNavigate } from "react-router-dom";

import { urls } from "./../../../config/constants";
import { NativeMenu } from "./../../inputs/NativeMenu";
import { MENU_SEPERATOR } from "./../../../config/menuConstants";

export default function HelpAndSupportPopOver(props) {
  const navigate = useNavigate();
  const { onClose } = props;
  const supportMenu = [
    {
      icon: "support",
      id: "ContactSupport",
      label: "Contact Support",
      link: urls.REQUEST_SUPPORT,
    },
    { type: MENU_SEPERATOR },
    {
      icon: "tips_and_updates",
      id: "FeatureRequest",
      label: "Feature Request",
      link: urls.REQUEST_FEATURE,
    },
    {
      icon: "auto_fix_high",
      id: "EnhancementRequest",
      label: "Enhancement Request",
      link: urls.REQUEST_ENHANCEMENT,
    },
    { type: MENU_SEPERATOR },
    {
      icon: "bug_report",
      id: "reportBug",
      label: "Report Bug",
      link: urls.REPORT_BUG,
    },
  ];

  const OnMenuClick = (item) => {
    navigate(item.link);
    onClose();
  };

  return (
    <NativeMenu
      menu={supportMenu}
      miniDrawer={false}
      multiLevel={false}
      open={true}
      OnMenuClick={OnMenuClick}
    />
  );
}
