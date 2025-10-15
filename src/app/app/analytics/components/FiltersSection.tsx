import { Button } from "@root/components/ui/button";
import { Badge } from "@root/components/ui/badge";
import {
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  Search,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type { FilterState, SortOption, UserStatus, DateRange } from "./types";
import { Card, Checkbox, Input, Select, SelectItem } from "@heroui/react";

interface FiltersSectionProps {
  filters: FilterState;
  activeFiltersCount: number;
  filtersExpanded: boolean;
  setFiltersExpanded: (expanded: boolean) => void;
  updateFilter: (key: keyof FilterState, value: any) => void;
  clearAllFilters: () => void;
  filteredUsersCount: number;
  totalUsersCount: number;
}

export function FiltersSection({
  filters,
  activeFiltersCount,
  filtersExpanded,
  setFiltersExpanded,
  updateFilter,
  clearAllFilters,
  filteredUsersCount,
  totalUsersCount,
}: FiltersSectionProps) {
  return (
    <Card shadow="sm" radius="sm" className="mb-8">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">
              Filters & Search
            </h3>
            {activeFiltersCount > 0 && (
              <Badge color="secondary" variant="default" className="ml-2">
                {activeFiltersCount} active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onPress={clearAllFilters}
                className="text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onPress={() => setFiltersExpanded(!filtersExpanded)}
            >
              {filtersExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {filtersExpanded && (
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Search Users
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={filters.search}
                    onValueChange={(value) => updateFilter("search", value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Sort By
                </label>
                <div className="flex gap-2">
                  <Select
                    selectedKeys={[filters.sortBy]}
                    onSelectionChange={(value) =>
                      updateFilter("sortBy", value.currentKey)
                    }
                  >
                    <SelectItem key="lastActivity">Last Activity</SelectItem>
                    <SelectItem key="itemsCreated">Items Created</SelectItem>
                    <SelectItem key="totalContent">Total Content</SelectItem>
                    <SelectItem key="name">Name</SelectItem>
                    <SelectItem key="joinDate">Join Date</SelectItem>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() =>
                      updateFilter(
                        "sortOrder",
                        filters.sortOrder === "asc" ? "desc" : "asc"
                      )
                    }
                    className="px-3 border-default-200 border"
                  >
                    {filters.sortOrder === "asc" ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  User Status
                </label>
                <div className="space-y-2">
                  {(
                    ["active", "dormant", "inactive", "new"] as UserStatus[]
                  ).map((status) => (
                    <div key={status} className="flex items-center space-x-2">
                      <Checkbox
                        id={status}
                        isSelected={filters.statusFilters.includes(status)}
                        onValueChange={(value) => {
                          if (value) {
                            updateFilter("statusFilters", [
                              ...filters.statusFilters,
                              status,
                            ]);
                          } else {
                            updateFilter(
                              "statusFilters",
                              filters.statusFilters.filter((s) => s !== status)
                            );
                          }
                        }}
                      />
                      <label
                        htmlFor={status}
                        className="text-sm capitalize cursor-pointer"
                      >
                        {status}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Activity Period
                </label>
                <Select
                  selectedKeys={[filters.dateRange]}
                  onSelectionChange={(value) =>
                    updateFilter("dateRange", value.currentKey)
                  }
                >
                  <SelectItem key="all">All Time</SelectItem>
                  <SelectItem key="7days">Last 7 days</SelectItem>
                  <SelectItem key="30days">Last 30 days</SelectItem>
                  <SelectItem key="90days">Last 90 days</SelectItem>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Items Created
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.minItems}
                    onChange={(e) => updateFilter("minItems", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.maxItems}
                    onChange={(e) => updateFilter("maxItems", e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Total Content
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.minContent}
                    onChange={(e) => updateFilter("minContent", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.maxContent}
                    onChange={(e) => updateFilter("maxContent", e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Showing {filteredUsersCount} of {totalUsersCount} users
              {activeFiltersCount > 0 && (
                <span className="ml-2 text-primary">
                  ({activeFiltersCount} filter
                  {activeFiltersCount !== 1 ? "s" : ""} applied)
                </span>
              )}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
