interface InterviewsPaginationProps {
  filteredCount: number;
  totalCount: number;
  searchQuery: string;
  itemsPerPage: number;
}

export const InterviewsPagination = ({
  filteredCount,
  totalCount,
  searchQuery,
  itemsPerPage,
}: InterviewsPaginationProps) => {
  return (
    <div className="flex items-center justify-between px-2">
      <div className="text-sm text-muted-foreground">
        Showing {filteredCount} of {totalCount} interviews
        {searchQuery && ` (filtered by "${searchQuery}")`}
      </div>
      {totalCount === itemsPerPage && (
        <div className="text-sm text-muted-foreground">
          Limited to {itemsPerPage} most recent interviews
        </div>
      )}
    </div>
  );
};
