import { element } from "prop-types";
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { CoreClasses } from "@wrappid/styles";
import NativeChip from "../../inputs/NativeChip";
import NativeIcon from "../../inputs/NativeIcon";
import NativeTypographyBody1 from "../../inputs/paragraph/NativeTypographyBody1";
import NativeBox from "../../layouts/NativeBox";
import NativeGrid from "../../layouts/NativeGrid";
import NativeStack from "../../layouts/NativeStack";
import NativeAccordion from "../../surfaces/NativeAccordion";
import NativeAccordionDetail from "../../surfaces/NativeAccordionDetail";
import NativeAccordionSummary from "../../surfaces/NativeAccordionSummary";
import NativeCheckbox from "../NativeCheckbox";
import NativeInput from "../NativeInput";
import ChildMap from "./ChildMap";

function multiLevelSerch(id, data, parentIndices) {
  let f = data.find((d) => Number(d.id) === Number(id));
  let fI = data.findIndex((d) => Number(d.id) === Number(id));
  if (f) {
    parentIndices.push(fI);
    return [f, parentIndices];
  } else {
    for (var j = 0; j < data.length; j++) {
      if (data[j].__children && data[j].__children.length > 0) {
        parentIndices.push(j);
        [f, parentIndices] = multiLevelSerch(
          id,
          data[j].__children,
          parentIndices
        );
        if (f) {
          return [f, parentIndices];
        }
      }
    }

    return [null, []];
  }
}
function setChildProps(parentOb, element, finalVal, level, path, id, rootFlag) {
  console.log("Level:", level, "PARENT AT START: ", parentOb);
  let rootNodeLevel = path.length - 1;

  if (Number(parentOb.id) === Number(id)) {
    console.log("\t ROOT: Setting data:", element, finalVal);
    parentOb[element] = finalVal;
  }
  for (var k = 0; k < parentOb?.__children?.length; k++) {
    //only setting value when we are at level deeper than parent
    // console.log(
    //   "\t level",
    //   level,
    //   "rootNodeLevel",
    //   rootNodeLevel,
    //   "rootFlag",
    //   rootFlag,
    //   "parentOb.__children[k]",
    //   parentOb.__children[k],
    // );
    if (level >= rootNodeLevel && rootFlag) {
      console.log("\t CHILD: Setting data:", element, finalVal);
      parentOb.__children[k][element] = finalVal;
    } else {
      console.log(
        "\t CHILD: Not Setting data, level: ",
        level,
        "rootNodeLevel:",
        rootNodeLevel
      );
    }

    parentOb.__children[k] = setChildProps(
      parentOb.__children[k],
      element,
      finalVal,
      level + 1,
      path,
      id,
      rootFlag ? rootFlag : path[level + 1] === k
    );
  }

  return parentOb;
}

function setDataValue(id, data, el, finalVal) {
  let [meta, path] = multiLevelSerch(id, data, []);
  console.log("path", path);
  data[path[0]] = setChildProps(
    data[path[0]],
    el,
    finalVal,
    0,
    path,
    id,
    Number(data[path[0]].id) === Number(id)
  );
  return data;
}

export default function ParentChildMap(props) {
  const [formData, setFormData] = useState([]);
  const tempData = useSelector((state) =>
    state?.api ? state?.api[props.editId]?.data : null
  );
  const data = tempData?.rows[props.id];
  console.log("props", formData);

  React.useEffect(() => {
    let temp = [...data];
    console.log("TEMP", temp);
    setFormData(temp);
  }, []);

  const handleChange = (e) => {
    let parts = e.target.id.split("-");
    let id = parts[0];
    let element = parts[1];
    let finalVal =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    console.log("id", id, "element", element, "val", finalVal);
    let temp = [...formData];
    console.log("DATA", temp);

    if (props.formik) {
      props.formik.setFieldValue(props.id, temp, 0);
    }
    temp = setDataValue(id, temp, element, finalVal);
    console.log("TEMP", temp);
    setFormData(temp);
  };

  return (
    formData &&
    Array.isArray(formData) &&
    formData?.map((parentOb, i) => (
      <NativeAccordion>
        <NativeAccordionSummary
          expandIcon={<NativeIcon>expand_more</NativeIcon>}
          styleClasses={[
            CoreClasses.FLEX.DIRECTION_ROW_REVERSE,
            CoreClasses.PADDING.PX1,
            CoreClasses.MARGIN.MY0,
          ]}
        >
          <NativeGrid
            styleClasses={[
              CoreClasses.ALIGNMENT.ALIGN_ITEMS_CENTER,
              CoreClasses.MARGIN.ML0,
            ]}
          >
            <NativeBox gridProps={{ gridSize: 10 }}>
              <NativeCheckbox
                id={parentOb.id + "-hasEntry"}
                label={
                  <NativeStack direction="row" spacing={1}>
                    <NativeTypographyBody1
                      styleClasses={[CoreClasses.MARGIN.M0]}
                    >
                      {parentOb?.name}
                    </NativeTypographyBody1>
                    {parentOb?.__children &&
                      parentOb?.__children?.length > 0 && (
                        <NativeChip
                          label={
                            "has " + parentOb?.__children?.length + " children"
                          }
                          size="small"
                        />
                      )}
                  </NativeStack>
                }
                onChange={handleChange}
                checked={parentOb?.hasEntry}
              />
            </NativeBox>

            <NativeInput
              id={parentOb.id + "-priority"}
              label="Order/Priority"
              type="number"
              onChange={handleChange}
              gridProps={{ gridSize: 2 }}
              value={parentOb?.priority}
            />
          </NativeGrid>
        </NativeAccordionSummary>

        <NativeAccordionDetail styleClasses={[CoreClasses.PADDING.PX1]}>
          <ChildMap
            label={parentOb.name + " > "}
            parentOb={parentOb}
            handleChange={handleChange}
            formData={formData}
          />
        </NativeAccordionDetail>
      </NativeAccordion>
    ))
  );
}
