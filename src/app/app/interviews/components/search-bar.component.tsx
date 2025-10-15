import { Input } from "@heroui/react";
import { Search } from "lucide-react";
import { useTranslations } from "@root/app/providers/TranslationContext";

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export const SearchBar = ({ searchQuery, onSearchChange }: SearchBarProps) => {
  const t = useTranslations("mainPage");

  return (
    <div className="flex items-center gap-4 mb-6">
      <Input
        placeholder={t(
          "searchInterviewsPlaceholder",
          "Search interviews by job profile, email, or level...",
        )}
        value={searchQuery}
        isClearable
        startContent={<Search size={18} />}
        onValueChange={(value) => onSearchChange(value)}
        className="max-w-md"
        color="primary"
        variant="bordered"
      />
    </div>
  );
};
