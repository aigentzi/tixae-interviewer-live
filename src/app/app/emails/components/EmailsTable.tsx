"use client";

import React from "react";
import {
  Input,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  DropdownTrigger,
  Dropdown,
  DropdownMenu,
  DropdownItem,
  Chip,
  SortDescriptor,
} from "@heroui/react";
import { Email, Interview, JobProfile } from "@root/shared/zod-schemas";
import { DeleteIcon, Edit } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

// Icons for the table
const SearchIcon = (props: any) => {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="1em"
      role="presentation"
      viewBox="0 0 24 24"
      width="1em"
      {...props}
    >
      <path
        d="M11.5 21C16.7467 21 21 16.7467 21 11.5C21 6.25329 16.7467 2 11.5 2C6.25329 2 2 6.25329 2 11.5C2 16.7467 6.25329 21 11.5 21Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M22 22L20 20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
};

const VerticalDotsIcon = ({ size = 24, width, height, ...props }: any) => {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height={size || height}
      role="presentation"
      viewBox="0 0 24 24"
      width={size || width}
      {...props}
    >
      <path
        d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 12c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
        fill="currentColor"
      />
    </svg>
  );
};

// Column definitions
const columns = [
  { name: "EMAIL", uid: "email", sortable: true },
  { name: "JOB PROFILE", uid: "jobProfile", sortable: true },
  { name: "INTERVIEW ID", uid: "interviewId", sortable: true },
  { name: "STATUS", uid: "status", sortable: false },
  { name: "ACTIONS", uid: "actions", sortable: false },
];

// Status color mapping
const statusColorMap = {
  sent: "success",
  notSent: "warning",
} as const;

interface EmailsTableProps {
  emails: Email[];
  jobProfiles: JobProfile[];
  interviewers: Partial<Interview>[];
  onEdit?: (email: Email) => void;
  onDelete?: (email: Email) => void;
}

export const EmailsTable = ({
  jobProfiles,
  emails,
  interviewers,
  onEdit,
  onDelete,
}: EmailsTableProps) => {
  const [filterValue, setFilterValue] = useState("");
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "email",
    direction: "ascending",
  });

  // Memoized job profiles lookup for performance
  const jobProfilesMap = useMemo(() => {
    return new Map(jobProfiles.map((profile) => [profile.id, profile]));
  }, [jobProfiles]);

  // Transform emails to include computed fields for sorting and display
  const processedEmails = useMemo(() => {
    return emails.map((email) => ({
      ...email,
      jobProfileName:
        jobProfilesMap.get(email.jobProfileId || "")?.name || "N/A",
      statusKey: email.interviewId ? "sent" : "notSent",
      statusLabel: email.interviewId ? "Sent Interview" : "Not Sent Interview",
    }));
  }, [emails, jobProfilesMap]);

  const hasSearchFilter = Boolean(filterValue);

  // Filter emails based on search
  const filteredItems = useMemo(() => {
    let filteredEmails = [...processedEmails];

    if (hasSearchFilter) {
      filteredEmails = filteredEmails.filter((email) =>
        email.email.toLowerCase().includes(filterValue.toLowerCase()),
      );
    }

    return filteredEmails;
  }, [processedEmails, filterValue, hasSearchFilter]);

  // Sort emails
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let first: string;
      let second: string;

      switch (sortDescriptor.column as string) {
        case "email":
          first = a.email;
          second = b.email;
          break;
        case "jobProfile":
          first = a.jobProfileName;
          second = b.jobProfileName;
          break;
        case "interviewId":
          first = a.interviewId || "";
          second = b.interviewId || "";
          break;
        default:
          return 0;
      }

      const cmp = first < second ? -1 : first > second ? 1 : 0;
      return sortDescriptor.direction === "descending" ? -cmp : cmp;
    });
  }, [sortDescriptor, filteredItems]);

  // Render cell content
  const renderCell = useCallback(
    (email: any, columnKey: string) => {
      const cellValue = email[columnKey];

      switch (columnKey) {
        case "email":
          return (
            <div className="flex flex-col">
              <p className="text-bold text-small">{email.email}</p>
            </div>
          );
        case "jobProfile":
          return (
            <div className="flex flex-col">
              <p className="text-bold text-small">{email.jobProfileName}</p>
            </div>
          );
        case "interviewId":
          return (
            <div className="flex flex-col">
              <p className="text-bold text-small">
                {email.interviewId || "N/A"}
              </p>
            </div>
          );
        case "status":
          return (
            <Chip
              className="capitalize"
              color={
                statusColorMap[email.statusKey as keyof typeof statusColorMap]
              }
              size="sm"
              variant="flat"
            >
              {email.statusLabel}
            </Chip>
          );
        case "actions":
          return (
            <div className="relative flex justify-end items-center gap-2">
              <Dropdown>
                <DropdownTrigger>
                  <Button isIconOnly size="sm" variant="light">
                    <VerticalDotsIcon className="text-default-300" />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu>
                  <DropdownItem key="edit" onPress={() => onEdit?.(email)}>
                    Edit
                  </DropdownItem>
                  <DropdownItem
                    key="delete"
                    className="text-danger"
                    color="danger"
                    onPress={() => onDelete?.(email)}
                  >
                    Delete
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          );
        default:
          return cellValue;
      }
    },
    [onEdit, onDelete],
  );

  // Search functionality
  const onSearchChange = useCallback((value: string) => {
    if (value) {
      setFilterValue(value);
    } else {
      setFilterValue("");
    }
  }, []);

  const onClear = useCallback(() => {
    setFilterValue("");
  }, []);

  // Top content with search
  const topContent = useMemo(() => {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-between gap-3 items-end">
          <Input
            isClearable
            className="w-full sm:max-w-[44%]"
            placeholder="Search by email..."
            startContent={<SearchIcon />}
            value={filterValue}
            onClear={onClear}
            onValueChange={onSearchChange}
          />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-default-400 text-small">
            Total {emails.length} emails
          </span>
        </div>
      </div>
    );
  }, [filterValue, onSearchChange, emails.length, onClear]);

  return (
    <Table
      isHeaderSticky
      aria-label="Emails table with sorting and actions"
      sortDescriptor={sortDescriptor}
      topContent={topContent}
      topContentPlacement="outside"
      onSortChange={setSortDescriptor}
      classNames={{
        wrapper: "max-h-[600px]",
      }}
    >
      <TableHeader columns={columns}>
        {(column) => (
          <TableColumn
            key={column.uid}
            align={column.uid === "actions" ? "center" : "start"}
            allowsSorting={column.sortable}
          >
            {column.name}
          </TableColumn>
        )}
      </TableHeader>
      <TableBody
        emptyContent={
          hasSearchFilter
            ? "No emails found matching your search"
            : "No emails found"
        }
        items={sortedItems}
      >
        {(item) => (
          <TableRow key={item.id}>
            {(columnKey) => (
              <TableCell>{renderCell(item, columnKey as string)}</TableCell>
            )}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
