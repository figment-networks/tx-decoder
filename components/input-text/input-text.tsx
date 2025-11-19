import React from "react";

type BaseProps = {
  id?: string;
  value: string;
  onChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  placeholder?: string;
  className?: string;
  borderClassName?: string;
  disabled?: boolean;
  autoFocus?: boolean;
};

type SingleLineProps = BaseProps & {
  multiline?: false;
  type?: React.HTMLInputTypeAttribute;
};

type MultiLineProps = BaseProps & {
  multiline: true;
  rows?: number;
};

export type InputTextProps = SingleLineProps | MultiLineProps;

const baseInputClasses =
  "w-full appearance-none rounded border bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-0.5 focus:ring-green-1000 focus:border-green-1000 disabled:bg-gray-100 disabled:cursor-not-allowed";

const InputText: React.FC<InputTextProps> = (props) => {
  const {
    value,
    onChange,
    placeholder,
    className,
    borderClassName,
    disabled,
    autoFocus,
    id,
  } = props;

  const combinedClasses = [
    baseInputClasses,
    borderClassName ?? "border-green-1000",
    props.multiline ? "min-h-[200px] p-4" : "h-12 px-4",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (props.multiline) {
    return (
      <textarea
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={combinedClasses}
        disabled={disabled}
        autoFocus={autoFocus}
        rows={props.rows ?? 12}
      />
    );
  }

  return (
    <input
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={props.type ?? "text"}
      className={combinedClasses}
      disabled={disabled}
      autoFocus={autoFocus}
    />
  );
};

export default InputText;
