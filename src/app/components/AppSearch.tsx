import { Input } from "@heroui/react";
import { Label } from "@root/components/ui/label";
import { ScrollArea } from "@root/components/ui/scroll-area";
import { SetState } from "@root/shared/zod-schemas";
import { useState, useEffect, useCallback } from "react";

// Custom debounce hook
const useDebounce = (value: string, delay: number): string => {
  const [debouncedValue, setDebouncedValue] = useState<string>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const Card = <
  T extends {
    id: string;
    name: string;
    email: string;
  },
>({
  item,
  onChoose,
}: {
  item: T;
  onChoose: () => void;
}) => {
  return (
    <div
      className="shadow-md p-4 cursor-pointer rounded-lg bg-primary-50 hover:bg-primary-100"
      onClick={onChoose}
    >
      <div className="flex flex-row gap-3">
        <div className="w-10 h-10 leading-10 bg-primary-200 rounded-full text-center text-gray-500">
          {item.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-sm text-gray-500">{item.name}</div>
          <div className="text-sm text-gray-500">{item.email}</div>
        </div>
      </div>
    </div>
  );
};

export const SearchList = <T extends any, A extends any>({
  searchList,
  onChoose,
}: {
  searchList: T[];
  onChoose: (value: A) => void;
}) => {
  const filteredList = searchList.map((item: any) => (
    <Card key={item.id} item={item} onChoose={() => onChoose(item.email)} />
  ));

  return <div className="flex flex-col gap-2 h-full">{filteredList}</div>;
};

export const AppSearch = <T extends any>({
  searchList,
  searchField,
  setSearchField,
  onUserSelect,
  label,
  debounceDelay = 300,
}: {
  searchList: T[];
  searchField: string;
  setSearchField: SetState<string>;
  onUserSelect?: (email: string) => void;
  label?: string;
  debounceDelay?: number;
}) => {
  const [localSearchField, setLocalSearchField] = useState(searchField);
  const debouncedSearchField = useDebounce(localSearchField, debounceDelay);
  const [isOpen, setIsOpen] = useState(false);

  // Update parent search field when debounced value changes
  useEffect(() => {
    setSearchField(debouncedSearchField);
  }, [debouncedSearchField, setSearchField]);

  // Sync local state with parent state
  useEffect(() => {
    console.log("current searchField:", searchField);
    setLocalSearchField(searchField);
  }, [searchField]);

  const filteredList = searchList.filter(
    (item: any) =>
      debouncedSearchField.length > 2 &&
      (item.name.toLowerCase().includes(debouncedSearchField.toLowerCase()) ||
        item.email.toLowerCase().includes(debouncedSearchField.toLowerCase())),
  );

  // const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
  //   setLocalSearchField(e.target.value);
  // }, []);

  function SearchComponent() {
    return (
      <ScrollArea className="h-[340px] w-full p-2">
        <p className="text-sm text-gray-500">Search Results</p>
        <SearchList
          searchList={filteredList}
          onChoose={(email: string) => {
            setIsOpen(false);
            if (onUserSelect) {
              onUserSelect(email);
            } else {
              setLocalSearchField(email);
            }
          }}
        />
      </ScrollArea>
    );
  }

  return (
    <div className="flex flex-col gap-2 relative">
      <Label className="text-sm">{label}</Label>
      <Input
        type="search"
        color="primary"
        variant="bordered"
        placeholder="Search Members"
        value={localSearchField}
        onValueChange={(value) => {
          if (value.length > 2) {
            setIsOpen(true);
          } else {
            setIsOpen(false);
          }
          // handleSearch(e);
          setLocalSearchField(value);
        }}
      />
      {isOpen && <SearchComponent />}
    </div>
  );
};
