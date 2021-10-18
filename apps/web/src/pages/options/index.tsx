import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { MobileDatePicker } from "@mui/lab";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { dialog } from "@tauri-apps/api";
import { useFormik } from "formik";
import { FunctionalComponent } from "preact";
import { useMemo } from "preact/hooks";
import * as Yup from "yup";

import { ClickableInput } from "~components/clickable-input";
import {
  CommercialLicenseClass,
  LicenseClass,
  PublicLicenseClass,
} from "~drivetest-ca-availabilities/scraper/api/interfaces";
import { Coordinates } from "~drivetest-ca-availabilities/scraper/utils/distanceTo";
import {
  ScraperOptions,
  LICENSE_EXPIRY_FORMAT,
  LICENSE_NUMBER_FORMAT,
} from "~drivetest-ca-availabilities/scraper/utils/scraperOptions";
import { getFormikFieldProps } from "~utilities/getFormikFieldProps";

import style from "./style.module.scss";

interface FormOptions extends Omit<ScraperOptions, "location" | "licenseType"> {
  location: Partial<Coordinates>;
  licenseType?: LicenseClass | "";
}

const licenseTypes: LicenseClass[] = [
  ...Object.values(PublicLicenseClass),
  ...Object.values(CommercialLicenseClass),
];

const Options: FunctionalComponent = () => {
  const formik = useFormik<Partial<FormOptions>>({
    /* eslint-disable no-template-curly-in-string */
    validationSchema: Yup.object({
      radius: Yup.number()
        .label("Radius")
        .typeError("${path} is not a valid number")
        .positive()
        .required(),
      months: Yup.number()
        .label("Number of months")
        .typeError("${path} is not a valid number")
        .positive()
        .max(12)
        .integer()
        .required(),
      location: Yup.object({
        latitude: Yup.number()
          .label("Latitude")
          .typeError("${path} is not a valid number")
          .required(),
        longitude: Yup.number()
          .label("Longitude")
          .typeError("${path} is not a valid number")
          .required(),
      }),
      email: Yup.string().email("Not a valid email"),
      chromiumPath: Yup.string(),
      enableContinuousSearching: Yup.bool(),
      licenseExpiry: Yup.string().matches(LICENSE_EXPIRY_FORMAT),
      licenseNumber: Yup.string().matches(
        LICENSE_NUMBER_FORMAT,
        'License number must match format found <a href="https://www.services.gov.on.ca/wps85/wcm/connect/s2i/34491094-6a43-4d56-a152-317816e236a5/2/qvkgtrfx4296227867638271464.png?MOD=AJPERES&CVID=" target="_blank">here</a>',
      ),
      licenseType: Yup.string()
        .oneOf(licenseTypes)
        .required()
        .label("License type"),
    }),
    /* eslint-enable no-template-curly-in-string */
    initialValues: {
      radius: 20,
      months: 6,
      enableContinuousSearching: false,
      licenseType: "",
      licenseExpiry: "",
      location: { latitude: undefined, longitude: undefined },
    },
    onSubmit: (values) => {
      console.log(values);
    },
  });
  const getFieldProps = useMemo(() => getFormikFieldProps(formik), [formik]);
  const showLicenseTypeError = getFieldProps("licenseType").error;

  return (
    <form>
      <div class={style.inputs}>
        <TextField
          required
          variant="filled"
          label="Radius"
          type="text"
          inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
          InputProps={{
            endAdornment: <InputAdornment position="end">km</InputAdornment>,
          }}
          {...getFieldProps("radius")}
        />
        <TextField
          required
          variant="filled"
          label="Months to look ahead"
          type="text"
          inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">months</InputAdornment>
            ),
          }}
          {...getFieldProps("months")}
        />
        {showLicenseTypeError}
        <FormControl
          required
          variant="filled"
          className={style.licenseType}
          error={showLicenseTypeError}
        >
          <InputLabel id="license-type-label">License Type</InputLabel>
          <Select
            labelId="license-type-label"
            {...getFieldProps("licenseType", false)}
          >
            {licenseTypes.map((licenseType) => (
              <MenuItem key={licenseType} value={licenseType}>
                {licenseType}
              </MenuItem>
            ))}
          </Select>
          {showLicenseTypeError && (
            <FormHelperText>
              {getFieldProps("licenseType").helperText}
            </FormHelperText>
          )}
        </FormControl>
      </div>

      <div class={style.inputs}>
        <div>
          <label>Your current location</label>
          <div class={style.connectedInputs}>
            <TextField
              required
              variant="filled"
              label="Latitude"
              type="text"
              inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
              InputProps={{
                endAdornment: <InputAdornment position="end">,</InputAdornment>,
              }}
              {...getFieldProps("location.latitude")}
            />
            <TextField
              required
              variant="filled"
              label="Longitude"
              type="text"
              inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
              {...getFieldProps("location.longitude")}
            />
          </div>
        </div>
      </div>

      <div>
        <label>Log in details</label>
        <div class={style.inputs}>
          <TextField
            variant="filled"
            label="Email"
            type="email"
            {...getFieldProps("email")}
          />
          <TextField
            variant="filled"
            label="License Number"
            type="text"
            {...getFieldProps("licenseNumber")}
          />
          <MobileDatePicker
            {...getFieldProps("licenseExpiry", false)}
            label="License Expiry"
            inputFormat="y-LL-dd"
            renderInput={(params) =>
              (<TextField variant="filled" {...params} error={false} />) as any
            }
            onAccept={(date) => {
              formik.setFieldValue("licenseExpiry", date);
            }}
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            onChange={() => {}}
          />
        </div>
      </div>

      <Accordion className={style.advancedOptions}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          Advanced Options
        </AccordionSummary>
        <AccordionDetails>
          <ClickableInput
            onClick={() => {
              dialog
                .open({
                  multiple: false,
                  filters: [{ extensions: ["app"], name: "Apps" }],
                })
                .then((chromiumPath) => {
                  if (typeof chromiumPath === "string") {
                    formik.setFieldValue("chromiumPath", chromiumPath);
                  }
                });
            }}
            ButtonProps={{ className: style.chromiumPath }}
            InputProps={{
              ...getFieldProps("chromiumPath"),
              className: style.chromiumPath,
              label: "Chromium Path",
              variant: "outlined",
              InputProps: { readOnly: true },
            }}
          />
          <FormControlLabel
            control={
              <Checkbox {...getFieldProps("enableContinuousSearching")} />
            }
            label="Continuous Searching"
          />
        </AccordionDetails>
      </Accordion>
      <Button onClick={() => formik.submitForm()}>Start</Button>
    </form>
  );
};

export default Options;
