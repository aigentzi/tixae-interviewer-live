import { Input } from "@heroui/react";
import { Label } from "@root/components/ui/label";
import { cn } from "@root/lib/utils";

interface CustomInputWithLabelProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function CustomInputWithLabel({
  label,
  placeholder,
  value,
  onChange,
  className,
}: CustomInputWithLabelProps) {
  return (
    <div className="relative w-full">
      <Input
        className={cn(
          "block rounded-t-lg px-2.5 pb-2.5 pt-5 w-full text-sm text-foreground-700 bg-content1 dark:bg-content3 border-0 appearance-none dark:text-foreground-700 dark:border-default-600 dark:focus:border-primary focus:outline-none focus:ring-0 focus:border-primary peer ",
          className,
        )}
        placeholder={""}
        value={value}
        onValueChange={(value) => onChange(value)}
      />
      <Label className="absolute text-sm text-foreground-700 dark:text-foreground-700 duration-300 transform -translate-y-4 scale-75 top-2.5 z-10 origin-[0] start-3 peer-focus:text-primary peer-focus:dark:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto">
        {label}
      </Label>
    </div>
  );
}
