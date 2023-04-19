import * as React from "react";
import { apiRequestAction } from "../../store/action/appActions";
import { HTTP_GET } from "../../config/constants";
import { useDispatch, useSelector } from "react-redux";
import {
  SELECT_OPTION_ERROR,
  SELECT_OPTION_LOAD,
  SELECT_OPTION_SUCCESS,
} from "../../store/types/selectOptionsTypes";
import NativeTextField from "./NativeTextField";
import NativeAutocomplete from "./NativeAutocomplete";
import NativeCircularProgress from "../feedback/NativeCircularProgress";
import NativeListItem from "../layouts/NativeListItem";
// import InfiniteScroll from "react-infinite-scroller";
import InfiniteScroll from "react-infinite-scroll-component";
import NativeIconButton from "./NativeIconButton";
import NativeIcon from "../inputs/NativeIcon";
import NativeFieldButton from "../forms/NativeFieldButton";
import NativeFormErrorText from "./NativeFormErrorText";
import NativeFormHelperText from "./NativeFormHelperText";
import { componentMap } from "../../utils/componentMap";
import { createFilterOptions } from "@mui/material/Autocomplete";
import { useNavigate } from "react-router-dom";
import { CoreClasses } from "@wrappid/styles";

const filter = createFilterOptions();
//TODO:
// - async select
// 	- up down arrow and enter key should work [priority: high]
// 	- load more on down arrow [priority: high]
// 	- home and end key will show first and last element of existing list [priority: low]
// 	- page up and page down should show first and last element of the visible list [priority: low]

export default function NativeAsyncSelect(props) {
  const options = useSelector((state) => state?.selectOptions?.options);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    itemKey,
    label,
    endpoint = null,
    query = {},
    optionsData = [],
    handleChange,
    onChangeDispatch,
    inlineAction,
    fieldActions,
    disableClearable,
    handleButtonCLick,
    submitLoading,
    submitSuccess,
    OnEditClick,
    editId,
    asyncLoading,
    allowEdit,
    optionCompProps,
  } = props;

  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [oldValue, setOldValue] = React.useState(null);

  const getKey = () => {
    return itemKey
      ? itemKey
      : label?.toString()?.trim().toLocaleLowerCase().split(" ").join("-");
  };

  const loading = submitLoading
    ? true
    : open
    ? optionsData && optionsData.length !== 0
      ? false
      : options[getKey()]
      ? options[getKey()].loading
      : true
    : false;

  // console.log("NativeAsyncSelect LOC props", props);

  const findOption = (options, value) => {
    let f1 = options?.find((x) => x.id === value);
    let f2 = options?.find((x) => x.value === value);
    if (f1) {
      return f1.label ? f1.label : f1.name ? f1.name : "";
    } else if (f2) {
      return f2.label ? f2.label : f2.name ? f2.name : "";
    } else return "";
  };

  const getLabelFromValue = (option, optionsData, options) => {
    if (optionsData.length !== 0) {
      return findOption(optionsData, option);
    } else if (options[getKey()]?.data) {
      return findOption(options[getKey()]?.data, option);
    }
  };

  React.useEffect(() => {
    // let active = true;
    if (!open) {
      return undefined;
    }
    if (asyncLoading !== false) loadData(true);
    return () => {
      // active = false;
    };
  }, [loading, inputValue]);

  React.useEffect(() => {
    loadData(true);
  }, []);

  React.useEffect(() => {
    if (submitSuccess) {
      setOldValue(props.value);
    }
  }, [submitLoading]);

  const checkValueDiff = () => {
    var flag = false;
    if (props?.multiple) {
      if (!oldValue && (!props.value || props.value.length === 0)) {
        return false;
      }
      if (props?.value?.length !== oldValue?.length) {
        return true;
      }
      for (var i = 0; i < props?.value?.length; i++) {
        if (props?.value[i].id !== oldValue[i]?.id) {
          return true;
        }
      }
    } else {
      if (
        (!props.value || !props.value.id || props.value.id === "") &&
        !oldValue
      ) {
        return false;
      }
      if (props?.value && !oldValue) {
        return true;
      }
      if (props?.value && oldValue) {
        if (
          (typeof props.value === typeof oldValue) === "string" &&
          props.value !== oldValue
        ) {
          return true;
        } else if (
          (typeof props?.value === typeof oldValue) === "object" &&
          props?.value?.id !== oldValue.id
        ) {
          return true;
        }
      }
    }

    return flag;
  };

  const OnChangeInput = (val) => {
    setInputValue(val);
  };

  const loadData = async (noPagination) => {
    console.log("LADING", loading, inputValue);
    if (props.asyncLoading !== false) {
      query["start"] =
        options[getKey()]?.data && !noPagination
          ? options[getKey()]?.data.length
          : 0;
      query["length"] = 100;
      query["input"] = encodeURIComponent(inputValue);
      query["_searchValue"] = encodeURIComponent(inputValue);
    }
    if ((!optionsData || optionsData.length === 0) && endpoint) {
      dispatch({
        type: SELECT_OPTION_LOAD,
        payload: getKey(),
      });
      dispatch(
        apiRequestAction(
          HTTP_GET,
          endpoint,
          true,
          query,
          SELECT_OPTION_SUCCESS,
          SELECT_OPTION_ERROR,
          null, //localAction
          null, //includeFile
          null, //file
          null, //formId
          null, //reload
          { key: getKey() }
        )
      );
    }
  };

  const CustomListboxComponent = React.forwardRef(function ListboxComponent(
    param,
    ref
  ) {
    /**
     * @todo there is still some problem on keyboard navigation
     * it is not stopping on first element it rolling over and scoll not happening
     * on keybard action
     */
    return (
      <div {...param} ref={ref}>
        <InfiniteScroll
          ref={ref}
          height={300}
          role="listbox"
          {...param}
          dataLength={options[getKey()]?.data.length}
          next={loadData}
          scrollableTarget={props.id + "-listbox"}
          hasMore={
            options[getKey()]?.data.length < options[getKey()].total
              ? true
              : false
          }
          loader={
            <p style={{ textAlign: "center", backgroundColor: "#f9dc01" }}>
              <b>Loading...</b>
            </p>
          }
          // endMessage={
          //   <p style={{ textAlign: "center", backgroundColor: "#f9dc01" }}>
          //     <b>Yay! You have seen it all</b>
          //   </p>
          // }
        />
      </div>
    );
  });

  return (
    <>
      <NativeAutocomplete
        onBlur={props?.formik?.handleBlur(props.id)}
        multiple={props.multiple ? props.multiple : false}
        id={props.id ? props.id : `"async-select-"+${getKey()}`}
        disableClearable={inlineAction ? true : disableClearable ? true : false}
        open={open}
        value={props.value ? props.value : props.multiple ? [] : ""}
        autoComplete={true}
        freeSolo={true}
        loading={loading}
        readOnly={props.readOnly}
        onHighlightChange={() => {
          console.log("CHANGE");
        }}
        onOpen={() => {
          setOpen(true);
        }}
        onClose={() => {
          setOpen(false);
        }}
        onFocus={
          props.onFormFocus && editId && props.readOnly
            ? () => {
                console.log("CLICKED");
                props.onFormFocus(editId);
              }
            : () => {
                console.log("CLICKED else");
              }
        }
        isOptionEqualToValue={
          props.isOptionEqualToValue
            ? (option, value) => props.isOptionEqualToValue(option, value)
            : (option, value) => {
                // console.log("COMPARE", option, value);
                if (
                  typeof option === "string" &&
                  typeof option === typeof value
                ) {
                  return option === value;
                } else return option.id === value.id;
              }
        }
        getOptionLabel={(option) => {
          return typeof option === "string"
            ? option
            : typeof option === "number"
            ? getLabelFromValue(option, optionsData, options)
            : props.getOptionLabel
            ? props.getOptionLabel(option)
            : option.label
            ? option.label
            : option.name
            ? option.name
            : "";
        }}
        filterOptions={(options, params) => {
          const filtered =
            props.asyncLoading !== false ? options : filter(options, params);
          if (props.creatable && params.inputValue !== "") {
            filtered.push({
              label: `Add "${params.inputValue}"`,
              name: `Add "${params.inputValue}"`,
              inputValue: params.inputValue,
            });
          }

          return filtered;
        }}
        onInputChange={(e, v) => {
          OnChangeInput(v);
        }}
        onChange={(e, values) => {
          console.log("VALUES", values);
          console.log("props.navigateUrl", props.navigateUrl);
          if (values?.inputValue && props.navigateUrl) {
            navigate(props.navigateUrl, { state: { inputValue } });
          }
          if (onChangeDispatch) {
            if (typeof onChangeDispatch === "function") {
              dispatch(onChangeDispatch(values));
            } else
              dispatch({
                type: onChangeDispatch.type,
                payload: values,
              });
          }
          if (handleChange) {
            handleChange(values);
          } else {
            if (props.getOptionValue) {
              props.formik.setFieldValue(
                props.id,
                props.getOptionValue(values)
              );
            } else {
              if (props.multiple) {
                var finalValue = "";
                for (var i = 0; i < values.length; i++) {
                  var val =
                    typeof values[i] === "string"
                      ? values[i]
                      : values[i].id
                      ? values[i].id
                      : values[i].name
                      ? values[i].id
                      : values[i].name
                      ? values[i].name
                      : "";
                  finalValue += val;
                  if (i < values.length - 1) {
                    finalValue += "|";
                  }
                }
                console.log("VALUE", finalValue);
                props.formik.setFieldValue(props.id, finalValue);
              } else props.formik.setFieldValue(props.id, values.id);
            }
          }
        }}
        options={
          optionsData.length !== 0
            ? optionsData
            : options[getKey()]?.data
            ? options[getKey()]?.data
            : []
        }
        renderOption={(optionProps, option, state) =>
          props.optionComp && componentMap[props.optionComp]?.comp ? (
            <React.Fragment>
              {React.createElement(componentMap[props.optionComp].comp, {
                data: option,
                state,
                optionProps,
                optionCompProps,
              })}
            </React.Fragment>
          ) : (
            <NativeListItem {...optionProps}>
              {option.inputValue
                ? option.label
                : props.getOptionLabel
                ? props.getOptionLabel(option)
                : option.label
                ? option.label
                : option.name
                ? option.name
                : ""}
            </NativeListItem>
          )
        }
        ListboxComponent={props.asyncLoading ? CustomListboxComponent : null}
        renderInput={(params) => (
          <NativeTextField
            {...params}
            label={label}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <React.Fragment>
                  {loading &&
                  inlineAction &&
                  fieldActions &&
                  fieldActions.length === 1 &&
                  !props.readOnly ? (
                    <NativeCircularProgress color="inherit" size={20} />
                  ) : null}
                  {/* inline form submits */}
                  {inlineAction && fieldActions && fieldActions.length === 1 ? (
                    !props.readOnly ? (
                      <>
                        {checkValueDiff() &&
                          fieldActions?.map((actionElement, i) => (
                            <NativeFieldButton
                              key={i}
                              element={actionElement}
                              formikprops={props.formik}
                              handleButtonCLick={handleButtonCLick}
                              submitLoading={submitLoading}
                            />
                          ))}
                        {props.value &&
                          ((props.multiple && props.value.length > 0) ||
                            (props.value.label && props.value.id)) && (
                            <NativeIconButton
                              onClick={(e) => {
                                props.multiple
                                  ? props.formik.setFieldValue(props.id, [])
                                  : props.formik.setFieldValue(props.id, {});

                                // @todo added for on clear handle change support
                                if (handleChange) {
                                  handleChange(e, props.multiple ? [] : {});
                                }
                              }}
                            >
                              <NativeIcon fontSize="small">close</NativeIcon>
                            </NativeIconButton>
                          )}
                      </>
                    ) : (
                      allowEdit !== false &&
                      !props.onFormFocus && (
                        <NativeIconButton
                          onClick={() => {
                            OnEditClick(editId);
                          }}
                        >
                          <NativeIcon fontSize="small">edit</NativeIcon>
                        </NativeIconButton>
                      )
                    )
                  ) : (
                    params.InputProps.endAdornment
                  )}
                </React.Fragment>
              ),
            }}
          />
        )}
      />
      {props?.touched && props?.error && (
        <NativeFormErrorText styleClasses={[CoreClasses.MARGIN.MT1]}>
          {props.touched && props.error}
        </NativeFormErrorText>
      )}
      {props?.helperText && (
        <NativeFormHelperText styleClasses={[CoreClasses.MARGIN.MT1]}>
          {props.helperText}
        </NativeFormHelperText>
      )}
    </>
  );
}
