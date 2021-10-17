import {
  FormikValues,
  FormikErrors,
  FormikTouched,
  FormikState,
  FieldInputProps,
  FieldMetaProps,
  FieldHelperProps,
} from "formik";
import parse from "html-react-parser";

import { getNestedValue } from "./getNestedValue";
import { isHtml } from "./isHtml";

type Formik<Values extends FormikValues = FormikValues> = {
  initialValues: Values;
  initialErrors: FormikErrors<unknown>;
  initialTouched: FormikTouched<unknown>;
  initialStatus: any;
  handleBlur: {
    (e: React.FocusEvent<any>): void;
    <T = any>(fieldOrEvent: T): T extends string ? (e: any) => void : void;
  };
  handleChange: {
    (e: React.ChangeEvent<any>): void;
    <T_1 = string | React.ChangeEvent<any>>(
      field: T_1,
    ): T_1 extends React.ChangeEvent<any>
      ? void
      : (e: string | React.ChangeEvent<any>) => void;
  };
  handleReset: (e: any) => void;
  handleSubmit: (e?: React.FormEvent<HTMLFormElement> | undefined) => void;
  resetForm: (nextState?: Partial<FormikState<Values>> | undefined) => void;
  setErrors: (errors: FormikErrors<Values>) => void;
  setFormikState: (
    stateOrCb:
      | FormikState<Values>
      | ((state: FormikState<Values>) => FormikState<Values>),
  ) => void;
  setFieldTouched: (
    field: string,
    touched?: boolean,
    shouldValidate?: boolean | undefined,
  ) => Promise<FormikErrors<Values>> | Promise<void>;
  setFieldValue: (
    field: string,
    value: any,
    shouldValidate?: boolean | undefined,
  ) => Promise<FormikErrors<Values>> | Promise<void>;
  setFieldError: (field: string, value: string | undefined) => void;
  setStatus: (status: any) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  setTouched: (
    touched: FormikTouched<Values>,
    shouldValidate?: boolean | undefined,
  ) => Promise<FormikErrors<Values>> | Promise<void>;
  setValues: (
    Values: React.SetStateAction<Values>,
    shouldValidate?: boolean | undefined,
  ) => Promise<FormikErrors<Values>> | Promise<void>;
  submitForm: () => Promise<any>;
  validateForm: (Values?: Values) => Promise<FormikErrors<Values>>;
  validateField: (name: string) => Promise<void> | Promise<string | undefined>;
  isValid: boolean;
  dirty: boolean;
  unregisterField: (name: string) => void;
  registerField: (name: string, { validate }: any) => void;
  getFieldProps: (nameOrOptions: any) => FieldInputProps<any>;
  getFieldMeta: (name: string) => FieldMetaProps<any>;
  getFieldHelpers: (name: string) => FieldHelperProps<any>;
  validateOnBlur: boolean;
  validateOnChange: boolean;
  validateOnMount: boolean;
  errors: FormikErrors<Values>;
  touched: FormikTouched<Values>;
  isSubmitting: boolean;
  isValidating: boolean;
  status?: any;
  submitCount: number;
};

function getErrorMessage(error: FormikErrors<any>[string]) {
  if (!error || typeof error === "string") return error;

  if (Array.isArray(error) && typeof error[0] === "string") {
    return error.join("\n");
  } else {
    // throws error for FormikErrors and FormikErrors[]
    throw new Error(
      "Extracting error message from FormikError is not supported, be more specific in your field choice",
    );
  }
}

export function getFormikFieldProps<T extends Record<string, any>>(
  form: Formik<T>,
) {
  return function <Options extends { name: string }>(
    nameOrOptions: string | Options,
    automaticallySetError = true,
  ): FieldInputProps<unknown> & {
    error?: boolean;
    helperText?: string | undefined;
  } {
    const fieldName =
      typeof nameOrOptions === "string" ? nameOrOptions : nameOrOptions.name;

    const error = getNestedValue(form.errors, fieldName);
    const errorMessage = getErrorMessage(error);

    if (automaticallySetError) {
      return {
        ...form.getFieldProps(nameOrOptions),
        error: !!getNestedValue(form.touched, fieldName) && !!errorMessage,
        helperText: (isHtml(errorMessage)
          ? parse(errorMessage)
          : errorMessage) as any,
      };
    }

    return form.getFieldProps(nameOrOptions);
  };
}
