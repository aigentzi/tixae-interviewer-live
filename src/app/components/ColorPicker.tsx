"use client";

import { Input } from "@heroui/react";
import { Label } from "@root/components/ui/label";
import { FC } from "react";

const ColorPicker: FC<{
  value: string;
  onChange: (value: string) => void;
  id: string;
}> = ({ value, onChange, id }) => {
  return (
    <div className="flex-row flex items-center gap-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor={id}>
          <div
            className="w-[30px] h-[30px] rounded-sm"
            style={{ backgroundColor: value }}
          />
        </Label>
        <input
          type="color"
          onChange={(e) => onChange(e.target.value)}
          value={value}
          id={id}
          className="invisible absolute w-[30px] outline-0 m-0 p-0 border-0 shadow-none rounded-md h-[30px]"
          onFocus={(e) => e.target.blur()}
        />
      </div>
      <div className="flex flex-col gap-2 rounded-none h-[30px]">
        <Input
          type="text"
          value={value}
          size="sm"
          variant="bordered"
          color="primary"
          onValueChange={(value) => onChange(value)}
          className="w-[100px]"
          maxLength={7}
        />
      </div>
    </div>
  );
};

export default ColorPicker;
