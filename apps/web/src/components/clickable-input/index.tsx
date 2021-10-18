import {
  ButtonBase,
  ButtonBaseProps,
  TextField,
  TextFieldProps,
} from "@mui/material";
import { FunctionalComponent } from "preact";
import { useMemo, useState } from "preact/hooks";

interface ClickableInputProps {
  onClick: () => void;
  ButtonProps?: Omit<ButtonBaseProps, "onClick">;
  InputProps?: TextFieldProps;
}

export const ClickableInput: FunctionalComponent<ClickableInputProps> = ({
  onClick,
  ButtonProps,
  InputProps,
}) => {
  const [isFocused, setFocused] = useState(false);
  const shouldFloatLabel = useMemo(
    () =>
      InputProps?.InputLabelProps?.shrink || !!InputProps?.value || isFocused,
    [isFocused, InputProps],
  );

  return (
    <ButtonBase onClick={onClick} {...ButtonProps}>
      <TextField
        {...InputProps}
        InputLabelProps={{
          ...InputProps?.InputLabelProps,
          shrink: shouldFloatLabel,
        }}
        onBlur={(e) => {
          InputProps?.onBlur?.(e);
          setFocused(false);
        }}
        onFocus={(e) => {
          InputProps?.onFocus?.(e);
          setFocused(true);
        }}
      />
    </ButtonBase>
  );
};
