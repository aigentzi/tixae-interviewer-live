import { Button, Chip, Input, InputProps } from "@heroui/react";
import {
  Dispatch,
  SetStateAction,
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";

export interface InputTagsRef {
  addPendingValue: () => void;
  getPendingValue: () => string;
}

type InputTagsProps = Omit<InputProps, "value" | "onChange"> & {
  value: string[];
  onChange: Dispatch<SetStateAction<string[]>>;
};

export const InputTags = forwardRef<InputTagsRef, InputTagsProps>(
  ({ value, onChange, ...props }, ref) => {
    const [pendingDataPoint, setPendingDataPoint] = useState("");

    const addPendingDataPoint = () => {
      if (pendingDataPoint.trim()) {
        const newDataPoints = new Set([...value, pendingDataPoint.trim()]);
        onChange(Array.from(newDataPoints));
        setPendingDataPoint("");
      }
    };

    useImperativeHandle(ref, () => ({
      addPendingValue: addPendingDataPoint,
      getPendingValue: () => pendingDataPoint,
    }));

    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={pendingDataPoint}
            onChange={(e) => setPendingDataPoint(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addPendingDataPoint();
              } else if (e.key === "," || e.key === " ") {
                e.preventDefault();
                addPendingDataPoint();
              }
            }}
            className="flex-1"
            radius="sm"
            {...props}
          />
          <Button
            type="button"
            variant="bordered"
            onPress={addPendingDataPoint}
            isDisabled={!pendingDataPoint.trim()}
            radius="sm"
          >
            Add
          </Button>
        </div>
        {value.length > 0 && (
          <div className="border border-default-200 rounded-lg min-h-[3rem] p-3 flex gap-2 flex-wrap items-start bg-content1">
            {value.map((item, idx) => (
              <Chip
                key={idx}
                variant="flat"
                color="primary"
                onClose={() => {
                  onChange(value.filter((i) => i !== item));
                }}
                className="flex items-center gap-1.5"
              >
                {item}
              </Chip>
            ))}
          </div>
        )}
      </div>
    );
  },
);

InputTags.displayName = "InputTags";
