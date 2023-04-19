import React, { Component } from "react";
import { connect } from "react-redux";
import NativeEditForm from "./NativeEditForm";
import {
  FORM_ARRAY_EDIT_DELETE_FUNCTION_MAP,
  FORM_EDIT_MODE,
  FORM_SANITIZATOIN_FUNCTION_MAP,
} from "./NativeFormConstants";
import {
  cancelFormEdit,
  createAllForms,
  handleFormLocalAction,
  onAddForm,
  onEditForm,
  resetFormReducer,
  storeForm,
} from "../../store/action/formAction";
import NativeGrid from "../layouts/NativeGrid";
import { apiRequestAction } from "../../store/action/appActions";
import NativeFormHeader from "./NativeFormHeader";
import NativeFormHeaderActions from "./NativeFormHeaderActions";
import NativeBox from "../layouts/NativeBox";
import { CoreClasses } from "@wrappid/styles";
import {
  createApiMeta,
  forReloadCheck,
  getForm,
  hookcallCheck,
} from "../../utils/formUtils";
import swal from "sweetalert";
import NativeTypographyBody1 from "../dataDisplay/paragraph/NativeTypographyBody1";
import NativeTypographyCaption from "../dataDisplay/paragraph/NativeTypographyCaption";
import NativeSkeleton from "../feedback/NativeSkeleton";
import NativeLink from "../navigation/NativeLink";
import { urls } from "../../config/constants";
import { compareObject } from "../../utils/objectUtils";
import { GET_FORM_ERROR, GET_FORM_SUCCESS } from "../../store/types/formTypes";

/**
 * @TODO
 * 1. render function for each field with string, json object, react component
 * 2. render field if display true
 */
class NativeForm extends Component {
  state = {
    editing: null,
    addForm: null,
    recreateForm: null,
    formId: this.props.formId,
    formIdAtMount: null,
    firstDataLoadFail: false,
    hideFlag: true,
    submitMode: null,
    prevQuery: null,
  };

  getAndStoreForm = async () => {
    let formJson =
      this.props.formJson && this.props.formJson[this.props.formId]
        ? this.props.formJson[this.props.formId]
        : null;

    if (!formJson) {
      let rawForm = this.props.rawForm;
      let rawFormStatus = this.props.rawFormStatus;
      let t = await getForm(this.props.formId, this.props.authenticated, {
        rawForm,
        rawFormStatus,
      });
      formJson = t.formJson;
      let success = t.success;
      let formId = t.formId;
      if (success) {
        this.props.storeForm(GET_FORM_SUCCESS, { formId, data: formJson });
      } else {
        this.props.storeForm(GET_FORM_ERROR, { formId, data: null });
      }
    }
    return formJson;
  };

  componentDidMount = async () => {
    // console.log("ROW FORM JSON", this.props.formJson, this.props.initData);
    this.setState({ formIdAtMount: this.props.formId });
    var formJson = await this.getAndStoreForm();

    this.props.CreateAllForms(
      this.props.formId,
      this.props.initData,
      this.props.mode,
      this.props.formJson,
      this.props.authenticated,
      formJson
    );

    if (!formJson) {
      this.setState({ firstDataLoadFail: true, prevQuery: this.props.query });
    }
    if (
      formJson?.read &&
      formJson?.onMountRead !== false &&
      this.props?.onMountRead !== false
    ) {
      var values = {};
      var apiMeta = createApiMeta(
        { editing: null, addForm: null, query: this.props.query },
        formJson,
        values,
        {
          editForm: this.props.editForm[this.props.formId],
          addForm: this.props.addForm[this.props.formId],
          apiMode: "read",
          _query: this.props._query,
        }
      );
      var sanData = { values: values, endpoint: apiMeta.endpoint };

      sanData = formJson?.read?.onSubmitRefine
        ? FORM_SANITIZATOIN_FUNCTION_MAP[formJson?.read?.onSubmitRefine](
            values,
            apiMeta,
            this.props.state,
            this.state
          )
        : sanData;

      if (sanData.values) {
        apiMeta.values = sanData.values;
      }
      if (sanData.endpoint) {
        apiMeta.endpoint = sanData.endpoint;
      }

      if (sanData.reduxData) {
        apiMeta.reduxData = sanData.reduxData;
      }

      console.log("-----ON MOUNT READ", apiMeta);
      this.props.HandleFormSubmit(
        apiMeta.method,
        apiMeta.endpoint,
        apiMeta.authRequired,
        apiMeta.values,
        apiMeta.successType,
        apiMeta.errorType,
        apiMeta.localAction,
        apiMeta.includeFile,
        apiMeta.files,
        this.props.formId,
        true,
        apiMeta.reduxData
      );
    }
  };
  componentDidUpdate = async () => {
    if (this.props.formId !== this.state.formIdAtMount) {
      let formJson = await this.getAndStoreForm();
      this.setState({ formIdAtMount: this.props.formId }, () => {
        this.props.CreateAllForms(
          this.props.formId,
          this.props.initData,
          this.props.mode,
          this.props.formJson,
          this.props.authenticated,
          formJson
        );
      });
    }

    var formSchema = this.props.rawFormSchema
      ? this.props.rawFormSchema[this.props.formId]
      : {};
    var r = forReloadCheck(
      this.props.formSubmitSuccess,
      this.props.formId,
      this.props.formJson,
      formSchema
    );

    let hookCallSuccess = null;
    let hookCallError = null;
    hookCallSuccess = hookcallCheck(
      this.props.formSubmitSuccess,
      this.props.formId,
      this.state.submitMode,
      {
        edit: this.props.afterEditSuccess,
        create: this.props.afterCreateSuccess,
        delete: this.props.afterDeleteSuccess,
      }
    );

    hookCallError = hookcallCheck(
      this.props.formSubmitError,
      this.props.formId,
      this.state.submitMode,
      {
        edit: this.props.afterEditError,
        create: this.props.afterCreateError,
        delete: this.props.afterDeleteError,
      },
      "error"
    );
    // console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%");
    // console.log(hookCallSuccess, hookCallError);
    // console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%");

    if (
      hookCallSuccess?.flag &&
      hookCallSuccess?.process &&
      this.state.submitMode
    ) {
      hookCallSuccess.process();
      await this.setState({ submitMode: null });
    }
    if (
      hookCallError?.flag &&
      hookCallError?.process &&
      this.state.submitMode
    ) {
      hookCallError.process();
      if (hookCallError.type === "error") {
        this.props.FormReset({
          formSubmitError: {
            ...this.props.formSubmitError,
            [this.props.formId]: null,
          },
        });
      }
      await this.setState({ submitMode: null });
    }

    let r2 =
      this.state.firstDataLoadFail &&
      formSchema?.read &&
      formSchema?.onMountRead !== false &&
      this.props?.onMountRead !== false;

    let r3 = compareObject(this.props.query, this.state.prevQuery);
    if (r || r2 || r3) {
      if (r2) {
        this.setState({
          firstDataLoadFail: false,
          prevQuery: this.props.query,
        });
      } else if (r3) {
        this.setState({ prevQuery: this.props.query });
      }
      var tempFormSubmitSuccess = {
        ...this.props.formSubmitSuccess,
        [this.props.formId]: null,
      };
      var tempFormEdit = { ...this.props.editForm, [this.props.formId]: null };
      var tempFormAdd = { ...this.props.addForm, [this.props.formId]: null };
      this.props.FormReset({
        formSubmitSuccess: tempFormSubmitSuccess,
        editForm: tempFormEdit,
        addForm: tempFormAdd,
      });

      var values = this.props.formData[this.props.formId]?.data?.rows || {};
      var formJson =
        this.props.formJson && this.props.formJson[this.props.formId]
          ? this.props.formJson[this.props.formId]
          : this.props.rawFormSchema
          ? this.props.rawFormSchema[this.props.formId]
          : {};
      var apiMeta = null;
      if (formJson?.read?.entity) {
        apiMeta = this.props.formData[formJson?.read?.entity]?.api;
      } else
        apiMeta = createApiMeta(
          { editing: null, addForm: null, query: this.props.query },
          formJson,
          values,
          {
            editForm: this.props.editForm[this.props.formId],
            addForm: this.props.addForm[this.props.formId],
            apiMode: "read",
            _query: this.props._query,
          }
        );
      var sanData = { values: values, endpoint: apiMeta.endpoint };

      sanData = formJson?.read?.entity
        ? FORM_SANITIZATOIN_FUNCTION_MAP[apiMeta?.onSubmitRefine](
            values,
            apiMeta,
            this.props.state,
            this.state
          )
        : formJson?.read?.onSubmitRefine
        ? FORM_SANITIZATOIN_FUNCTION_MAP[formJson?.read?.onSubmitRefine](
            values,
            apiMeta,
            this.props.state,
            this.state
          )
        : sanData;

      if (sanData.values) {
        apiMeta.values = sanData.values;
      }
      if (sanData.endpoint) {
        apiMeta.endpoint = sanData.endpoint;
      }
      if (sanData.reduxData) {
        apiMeta.reduxData = sanData.reduxData;
      }

      console.log("-----RELOAD", apiMeta);
      this.props.HandleFormSubmit(
        apiMeta.method,
        apiMeta.endpoint,
        apiMeta.authRequired,
        {},
        apiMeta.successType,
        apiMeta.errorType,
        apiMeta.localAction,
        apiMeta.includeFile,
        apiMeta.files,
        this.props.formId,
        true,
        apiMeta.reduxData
      );
    }
  };

  handleSubmit = async (values) => {
    var formJson =
      this.props.formJson && this.props.formJson[this.props.formId]
        ? this.props.formJson[this.props.formId]
        : this.props.rawFormSchema
        ? this.props.rawFormSchema[this.props.formId]
        : {};

    //hook function to excute befire submit
    if (this.props.beforeSubmit) this.props.beforeSubmit();

    var apiMeta = createApiMeta(this.state, formJson, values, {
      editForm: this.props.editForm[this.props.formId],
      addForm: this.props.addForm[this.props.formId],
      apiMode: this.props.apiMode,
      _query: this.props._query,
    });

    var sanData = { values: values, endpoint: apiMeta.endpoint };
    if (apiMeta.mode === "edit" && formJson?.edit?.onSubmitRefine) {
      console.log("EDITING");
      sanData = FORM_SANITIZATOIN_FUNCTION_MAP[formJson?.edit?.onSubmitRefine](
        values,
        apiMeta,
        this.props.state,
        this.state
      );
    } else if (apiMeta.mode === "create" && formJson?.create?.onSubmitRefine) {
      console.log("ADDING");
      sanData = FORM_SANITIZATOIN_FUNCTION_MAP[
        formJson?.create?.onSubmitRefine
      ](values, apiMeta, this.props.state, this.state);
    }

    // console.log("SANITIZED DATA", sanData);

    if (sanData.values) {
      apiMeta.values = sanData.values;
    }
    if (sanData.endpoint) {
      apiMeta.endpoint = sanData.endpoint;
    }
    if (sanData.reduxData) {
      apiMeta.reduxData = sanData.reduxData;
    }

    // console.log("SUBMIT", apiMeta);
    this.props.HandleFormSubmit(
      apiMeta.method,
      apiMeta.endpoint,
      apiMeta.authRequired,
      apiMeta.values,
      apiMeta.successType,
      apiMeta.errorType,
      apiMeta.localAction,
      apiMeta.includeFile,
      apiMeta.files,
      this.props.formId,
      apiMeta.reload,
      apiMeta.reduxData
    );

    this.setState({ submitMode: apiMeta.mode });

    //hook function to excute after submit
    if (this.props.afterSave) this.props.afterSave();
  };

  handleButtonClick = (data) => {
    var values = {};
    if (data.onSubmitRefine) {
      var othersFormData = {
        formId: this.props.formId,
        editForm: this.props.editForm,
      };
      values = FORM_SANITIZATOIN_FUNCTION_MAP[data.onSubmitRefine](
        values,
        {},
        this.props.state,
        othersFormData
      );
    }

    if (data.localAction) {
      this.props.HandleLocalFormAction(values?.values, data.localAction);
    } else
      this.props.HandleFormSubmit(
        data.method,
        data.endpoint,
        data.authRequired,
        values,
        data.successType,
        data.errorType,
        data.localAction,
        data.includeFile,
        data.files,
        this.props.formId,
        data.reload
      );
  };

  OnEditClick = (id) => {
    //hook function to excute before edit
    if (this.props.beforeEdit) this.props.beforeEdit();
    this.setState({
      editing: id,
      addForm: null,
    });
    this.props.OnEditForm(this.props.formId, id);
    //hook function to excute after edit
    if (this.props.afterEdit) this.props.afterEdit();
  };

  OnDeleteClick = (id) => {
    this.setState(
      {
        deleting: id,
      },
      () => {
        swal({
          icon: "info",
          title: "Confirm?",
          text: "Are you sure?",
          buttons: {
            cancel: "Cancel",
            confirm: "Yes",
          },
        }).then((data) => {
          if (data) {
            this.CompleteDelete();
          }
        });
      }
    );
  };

  CompleteDelete = () => {
    var formJson =
      this.props.formJson && this.props.formJson[this.props.formId]
        ? this.props.formJson[this.props.formId]
        : this.props.rawFormSchema
        ? this.props.rawFormSchema[this.props.formId]
        : {};
    var apiMeta = createApiMeta(
      this.state,
      formJson,
      this.props.formData[this.props.formId]?.data?.rows,
      {
        editForm: this.props.editForm[this.props.formId],
        addForm: this.props.addForm[this.props.formId],
        apiMode: "delete",
        _query: this.props._query,
      }
    );

    var sanData = {
      values: this.props.formData[this.props.formId]?.data?.rows,
      endpoint: apiMeta.endpoint,
    };

    if (formJson?.delete?.onSubmitRefine) {
      console.log("DELETING");
      sanData = FORM_SANITIZATOIN_FUNCTION_MAP[
        formJson?.delete?.onSubmitRefine
      ](
        this.props.formData[this.props.formId]?.data?.rows,
        apiMeta,
        this.props.state,
        this.state
      );
    }

    if (sanData.values) {
      apiMeta.values = sanData.values;
    }
    if (sanData.endpoint) {
      apiMeta.endpoint = sanData.endpoint;
    }
    //hook function to excute befire submit
    if (this.props.beforeDelete) this.props.beforeDelete();

    this.props.HandleFormSubmit(
      apiMeta.method,
      apiMeta.endpoint,
      apiMeta.authRequired,
      {},
      apiMeta.successType,
      apiMeta.errorType,
      apiMeta.localAction,
      apiMeta.includeFile,
      apiMeta.files,
      this.props.formId,
      apiMeta.reload
    );
    this.setState({ submitMode: "delete" });

    //hook function to excute after submit
    if (this.props.afterDelete) this.props.afterDelete();
  };

  OnAdd = () => {
    //hook function to excute before add
    if (this.props.beforeAdd) this.props.beforeAdd();
    var temp = this.props.processedForms[this.props.formId];
    // console.log("here", temp);
    this.setState({ addForm: { [this.props.formId]: temp }, editing: null });
    this.props.OnAddForm(
      this.props.formId,
      this.props.processedForms[this.props.formId]
    );
    //hook function to excute after submit
    if (this.props.afterAdd) this.props.afterAdd();
  };

  OnCancel = () => {
    //hook function to excute before cancel
    if (this.props.beforeCancel) this.props.beforeCancel();

    this.props.CancelFormEdit(this.props.formId);

    //hook function to excute after cancel
    if (this.props.afterCancel) this.props.afterCancel();
  };

  render() {
    const {
      processedForms,
      mode,
      arrayView,
      formId,
      allowEdit,
      allowAdd,
      allowDelete,
      editForm,
      addForm,
      formSubmitLoading,
      formSubmitSuccess,
      formDataReadLoading,
      formRef,
      formData,
      onFormFocus,
      rawFormSchema,
      preview,
      arrayDataLimit,
    } = this.props;
    const arrayFlag =
      arrayView || (rawFormSchema ? rawFormSchema[formId]?.arrayView : false);

    var { initData } = this.props;
    if (!initData) {
      var newData = formData[formId]?.data?.rows;
      if (newData) {
        if (Array.isArray(newData)) {
          if (newData?.length > 0) {
            initData = newData;
          }
        } else if (Object.keys(newData).length > 0) {
          initData = newData;
        }
      }
    }

    // console.log("LOC STATE", initData);
    // console.log("LOC props", this.props);

    // console.log(
    //   "SPECIAL ---------------",
    //   arrayFlag,
    //   formId,
    //   arrayView
    // );

    return (
      <>
        {rawFormSchema && !rawFormSchema[formId]?.inlineAction && (
          <NativeFormHeader
            mode={
              mode === FORM_EDIT_MODE ||
              (editForm[formId] && editForm[formId].editing)
            }
            heading={rawFormSchema ? rawFormSchema[formId]?.heading : ""}
            subHeading={rawFormSchema ? rawFormSchema[formId]?.subHeading : ""}
            headerAction={
              rawFormSchema &&
              rawFormSchema[formId] &&
              rawFormSchema[formId].headerAction
                ? rawFormSchema[formId]?.headerAction
                : true
            }
            formId={formId}
            action={
              arrayFlag
                ? allowAdd !== false
                  ? [
                      {
                        icon: "add",
                        OnClick: this.OnAdd,
                        disable: preview,
                        title: "add",
                      },
                    ]
                  : []
                : allowEdit !== false
                ? allowDelete !== false
                  ? [
                      {
                        icon: "edit_note",
                        OnClick: this.OnEditClick,
                        disable: preview,
                        title: "edit",
                      },
                      {
                        icon: "delete_outline",
                        // OnClick: () => {
                        //   // alert("Single component delete tobe done");
                        // },
                        disable: preview,
                        title: "delete",
                        OnClick: this.OnDeleteClick,
                      },
                    ]
                  : [
                      {
                        icon: "edit_note",
                        OnClick: this.OnEditClick,
                        disable: preview,
                        title: "edit",
                      },
                    ]
                : allowDelete !== false
                ? [
                    {
                      icon: "delete_outline",
                      // OnClick: () => {
                      //   alert("Single component delete tobe done");
                      // },
                      title: "delete",
                      disable: preview,
                      OnClick: this.OnDeleteClick,
                    },
                  ]
                : []
            }
          />
        )}
        <NativeGrid NativeId="NativeFormGrid" {...this.props.designProps}>
          {addForm && addForm[formId] && addForm[formId].add && (
            <NativeEditForm
              styleClasses={this.props.styleClasses}
              forms={addForm}
              formId={formId}
              handleSubmit={this.handleSubmit}
              handleButtonCLick={this.handleButtonClick}
              mode={true}
              submitLoading={formSubmitLoading[formId]}
              submitSuccess={formSubmitSuccess[formId]}
              OnEditClick={this.OnEditClick}
              OnCancelClick={this.OnCancel}
              formRef={formRef}
              formDataReadLoading={formDataReadLoading}
              //Only add form case gets data from fom reducer
              formData={addForm[formId]?.formInitialOb}
              allowEdit={allowEdit}
              preview={preview}
            />
          )}

          {arrayFlag ? (
            <>
              {!initData ? (
                <NativeTypographyBody1>No Data found</NativeTypographyBody1>
              ) : formDataReadLoading && formDataReadLoading[formId] ? (
                processedForms[formId]?.skeletonComp ? (
                  React.createElement(processedForms[formId]?.skeletonComp, {})
                ) : (
                  <NativeSkeleton variant="rectangular" height={60} />
                )
              ) : Array.isArray(initData) ? (
                <>
                  {initData?.map((initDataOb, i) =>
                    !arrayDataLimit ||
                    !this.state.hideFlag ||
                    (arrayDataLimit && i < arrayDataLimit) ? (
                      <NativeGrid>
                        <NativeBox gridProps={{ gridSize: 10 }}>
                          <NativeEditForm
                            styleClasses={this.props.styleClasses}
                            index={i}
                            forms={processedForms}
                            formId={formId}
                            handleSubmit={this.handleSubmit}
                            handleButtonCLick={this.handleButtonClick}
                            initData={initDataOb}
                            submitLoading={formSubmitLoading[formId]}
                            submitSuccess={formSubmitSuccess[formId]}
                            mode={
                              mode === FORM_EDIT_MODE ||
                              (editForm[formId] &&
                                editForm[formId].editing &&
                                editForm[formId].formArrayId === initDataOb.id)
                            }
                            OnEditClick={this.OnEditClick}
                            OnCancelClick={this.OnCancel}
                            editFormId={initDataOb.id}
                            formRef={formRef}
                            formDataReadLoading={formDataReadLoading}
                            formData={formData[formId]?.data?.rows}
                            allowEdit={allowEdit}
                            onFormFocus={onFormFocus}
                            preview={preview}
                          />
                        </NativeBox>
                        <NativeBox
                          gridProps={{ gridSize: 2 }}
                          styleClasses={[CoreClasses.LAYOUT.RIGHT_ALIGN]}
                        >
                          {formDataReadLoading[formId] ? null : (
                            <NativeFormHeaderActions
                              index={i}
                              id={initDataOb.id}
                              preview={preview}
                              action={
                                allowEdit !== false
                                  ? allowDelete !== false
                                    ? [
                                        {
                                          icon: "edit_note",
                                          OnClick:
                                            processedForms[formId] &&
                                            processedForms[formId]
                                              .arrayDataNotEditable
                                              ? FORM_ARRAY_EDIT_DELETE_FUNCTION_MAP[
                                                  processedForms[formId]
                                                    .arrayDataNotEditable
                                                ](initDataOb)
                                                ? this.OnEditClick
                                                : () => {
                                                    swal(
                                                      "Error",
                                                      "Data not editable",
                                                      "error"
                                                    );
                                                  }
                                              : this.OnEditClick,
                                          disable: preview,
                                          title: "edit",
                                        },
                                        {
                                          icon: "delete_outline",
                                          OnClick:
                                            processedForms[formId] &&
                                            processedForms[formId]
                                              .arrayDataNotDeletable
                                              ? FORM_ARRAY_EDIT_DELETE_FUNCTION_MAP[
                                                  processedForms[formId]
                                                    .arrayDataNotDeletable
                                                ](initDataOb)
                                                ? this.OnDeleteClick
                                                : () => {
                                                    swal(
                                                      "Error",
                                                      "Data not deletable",
                                                      "error"
                                                    );
                                                  }
                                              : this.OnDeleteClick,
                                          disable: preview,
                                          title: "delete",
                                        },
                                      ]
                                    : [
                                        {
                                          icon: "edit_note",
                                          OnClick:
                                            processedForms[formId] &&
                                            processedForms[formId]
                                              .arrayDataNotEditable
                                              ? FORM_ARRAY_EDIT_DELETE_FUNCTION_MAP[
                                                  processedForms[formId]
                                                    .arrayDataNotEditable
                                                ](initDataOb)
                                                ? this.OnEditClick
                                                : () => {
                                                    swal(
                                                      "Error",
                                                      "Data not editable"
                                                    );
                                                  }
                                              : this.OnEditClick,
                                          disable: preview,
                                          title: "edit",
                                        },
                                      ]
                                  : allowDelete !== false
                                  ? [
                                      {
                                        icon: "delete_outline",
                                        OnClick:
                                          processedForms[formId] &&
                                          processedForms[formId]
                                            .arrayDataNotDeletable
                                            ? FORM_ARRAY_EDIT_DELETE_FUNCTION_MAP[
                                                processedForms[formId]
                                                  .arrayDataNotDeletable
                                              ](initDataOb)
                                              ? this.OnDeleteClick
                                              : () => {
                                                  swal(
                                                    "Error",
                                                    "Data not deletable"
                                                  );
                                                }
                                            : this.OnDeleteClick,
                                        disable: preview,
                                        title: "delete",
                                      },
                                    ]
                                  : []
                              }
                            />
                          )}
                        </NativeBox>
                      </NativeGrid>
                    ) : null
                  )}
                  {arrayDataLimit &&
                    initData?.length > arrayDataLimit &&
                    this.state.hideFlag && (
                      <NativeBox
                        styleClasses={[CoreClasses.LAYOUT.HORIZONTAL_CENTER]}
                      >
                        <NativeLink
                          href={
                            !this.props.query
                              ? urls.SHOW_SPECIFIC.replace(":formId", formId)
                              : urls.SHOW_SPECIFIC.replace(":formId", formId) +
                                "?query=" +
                                encodeURIComponent(
                                  JSON.stringify(this.props.query)
                                )
                          }
                        >
                          <NativeTypographyCaption>
                            Show {Number(initData?.length - arrayDataLimit)}{" "}
                            other
                            {Number(initData?.length - arrayDataLimit) > 1 &&
                              "s"}
                          </NativeTypographyCaption>
                        </NativeLink>
                      </NativeBox>
                    )}
                </>
              ) : !initData ? (
                <NativeTypographyBody1>No Data found</NativeTypographyBody1>
              ) : null}
            </>
          ) : allowEdit === false ? (
            <NativeEditForm
              styleClasses={this.props.styleClasses}
              forms={processedForms}
              formId={formId}
              handleSubmit={this.handleSubmit}
              handleButtonCLick={this.handleButtonClick}
              initData={initData}
              mode={false}
              formRef={formRef}
              formDataReadLoading={formDataReadLoading}
              formData={formData[formId]?.data?.rows}
              allowEdit={allowEdit}
              preview={preview}
            />
          ) : (
            <NativeEditForm
              styleClasses={this.props.styleClasses}
              forms={processedForms}
              formId={formId}
              handleSubmit={this.handleSubmit}
              handleButtonCLick={this.handleButtonClick}
              initData={initData}
              mode={
                mode === FORM_EDIT_MODE ||
                (editForm[formId] && editForm[formId].editing)
              }
              submitLoading={formSubmitLoading[formId]}
              submitSuccess={formSubmitSuccess[formId]}
              OnEditClick={this.OnEditClick}
              OnCancelClick={this.OnCancel}
              editFormId={formId}
              formRef={formRef}
              formDataReadLoading={formDataReadLoading}
              formData={formData[formId]?.data?.rows}
              allowEdit={allowEdit}
              onFormFocus={onFormFocus}
              preview={preview}
            />
          )}
        </NativeGrid>
      </>
    );
  }
}

const mapStateToProps = (state) => {
  console.log("STATE", state);
  return {
    state: state,
    auth: state.auth,
    processedForms: state.forms.processedForms,
    editForm: state.forms.editForm,
    addForm: state.forms.addForm,
    formSubmitSuccess: state.forms.formSubmitSuccess,
    formSubmitError: state.forms.formSubmitError,
    formSubmitLoading: state.forms.formSubmitLoading,
    formDataReadLoading: state.forms.formDataReadLoading,
    rawFormSchema: state.forms.rawForm,
    formData: state.api,
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    CreateAllForms: (
      formId,
      initData,
      mode,
      rowFormJson,
      authenticated,
      formSchema
    ) => {
      dispatch(
        createAllForms(
          formId,
          initData,
          mode,
          rowFormJson,
          authenticated,
          formSchema
        )
      );
    },
    HandleFormSubmit: (
      method,
      endpoint,
      authRequired,
      data,
      successType,
      errorType,
      localAction,
      includeFile,
      files,
      formId,
      reload,
      reduxData
    ) => {
      dispatch(
        apiRequestAction(
          method,
          endpoint,
          authRequired,
          data,
          successType,
          errorType,
          localAction,
          includeFile,
          files,
          formId,
          reload,
          reduxData,
          true
        )
      );
    },
    OnEditForm: (formId, formArrayId) => {
      dispatch(onEditForm(formId, formArrayId));
    },
    OnAddForm: (formId, data) => {
      dispatch(onAddForm(formId, data));
    },
    CancelFormEdit: (formId) => {
      dispatch(cancelFormEdit(formId));
    },
    HandleLocalFormAction: (data, localAction) => {
      dispatch(handleFormLocalAction(data, localAction));
    },
    FormReset: (data) => {
      dispatch(resetFormReducer(data));
    },
    storeForm: (type, payload) => {
      dispatch(storeForm(type, payload));
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(NativeForm);
