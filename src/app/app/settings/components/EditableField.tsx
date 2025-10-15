"use client";

import { useState, useEffect } from "react";
import { Button } from "@heroui/button";
import { Pencil, Loader2 } from "lucide-react";
import { useTranslations } from "@root/app/providers/TranslationContext";

interface EditableFieldProps {
  value: string;
  label: string;
  type?: "text" | "email" | "tel";
  placeholder?: string;
  required?: boolean;
  onSave: (value: string) => Promise<void>;
  isTextArea?: boolean;
}

export function EditableField({
  value: initialValue,
  label,
  type = "text",
  placeholder = "Not set",
  required = false,
  onSave,
  isTextArea = false,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const tCommon = useTranslations("common");

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleSave = async () => {
    if (required && !value.trim()) {
      return;
    }

    try {
      setIsLoading(true);
      await onSave(value);
      setIsEditing(false);
    } catch (err: any) {
      // Handle error silently, just keep the form in edit mode
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setValue(initialValue);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            {isTextArea ? (
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                className="w-full text-sm text-foreground bg-background border border-border rounded px-3 py-1.5 shadow-sm focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed min-h-[100px] resize-y"
                disabled={isLoading}
                rows={4}
              />
            ) : (
              <input
                type={type}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                className="w-full text-sm text-foreground bg-background border border-border rounded px-3 py-1.5 shadow-sm focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              />
            )}
            {isLoading && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex flex-row gap-2 sm:flex-none">
            <Button
              onPress={handleSave}
              className="flex-1 sm:flex-none btn-primary px-3 py-1.5 text-xs whitespace-nowrap"
              isDisabled={
                isLoading ||
                value === initialValue ||
                (required && !value.trim())
              }
            >
              {isLoading
                ? tCommon("saving", "Saving...")
                : tCommon("save", "Save")}
            </Button>
            <Button
              onPress={handleCancel}
              variant="light"
              className="flex-1 sm:flex-none px-3 py-1.5 text-xs whitespace-nowrap"
              isDisabled={isLoading}
            >
              {tCommon("cancel", "Cancel")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-muted-foreground mb-1">
        {label}
      </label>
      <div className="flex items-center justify-between group">
        <span className="text-sm text-foreground">
          {initialValue || (
            <span className="text-muted-foreground italic">{placeholder}</span>
          )}
        </span>
        <Button
          onPress={() => setIsEditing(true)}
          variant="light"
          isIconOnly
          className="p-1 text-xs text-primary hover:text-primary/80 hover:bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
