"use client";

import { useGAuth } from "@root/app/hooks/guath.hook";
import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { api } from "@root/trpc/react";
import {
  Card,
  CardHeader,
  CardBody,
  Chip,
  Avatar,
  Button,
  Input,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  CircularProgress,
} from "@heroui/react";
import {
  Users,
  Search,
  Filter,
  Mail,
  Phone,
  Calendar,
  UserCheck,
  FileText,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { LOADING_MESSAGES } from "../constants/dashboard";
import Link from "next/link";

export default function ApplicantsPage() {
  const { activeWorkspace } = useActiveWorkspace();
  const { gauthUser } = useGAuth();
  const [searchValue, setSearchValue] = useState("");
  const [page, setPage] = useState(1);
  const rowsPerPage = 12;

  const { data: applicantsData, isLoading } = api.applicants.getAll.useQuery(
    {
      workspaceId: activeWorkspace?.id || "",
    },
    {
      enabled: !!activeWorkspace?.id,
      retry: false,
    },
  );

  const filteredApplicants = useMemo(() => {
    if (!applicantsData?.applicants) return [];

    return applicantsData.applicants.filter((applicant) =>
      `${applicant.firstName} ${applicant.lastName} ${applicant.email}`
        .toLowerCase()
        .includes(searchValue.toLowerCase()),
    );
  }, [applicantsData?.applicants, searchValue]);

  const paginatedApplicants = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredApplicants.slice(start, end);
  }, [filteredApplicants, page]);

  const totalPages = Math.ceil(filteredApplicants.length / rowsPerPage);

  const getGenderChip = (gender: string) => {
    const normalized = (gender || "").trim();
    if (!normalized) return null;
    return (
      <Chip size="sm" variant="flat" color="default">
        {normalized.charAt(0).toUpperCase() + normalized.slice(1)}
      </Chip>
    );
  };

  const getInterviewsChip = (count: number) => {
    const color = count > 0 ? "primary" : "default";
    return (
      <Chip size="sm" variant="flat" color={color}>
        {count} {count === 1 ? "Interview" : "Interviews"}
      </Chip>
    );
  };

  if (isLoading || !activeWorkspace?.id) {
    return <LoadingSpinner message={LOADING_MESSAGES.APPLICANTS} />;
  }

  if (!applicantsData?.applicants?.length) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Applicants</h1>
              <p className="text-default-600">
                Manage and review job applicants
              </p>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <Card className="p-8">
          <CardBody>
            <div className="text-center py-12">
              <div className="p-4 bg-default-100 rounded-full w-fit mx-auto mb-4">
                <Users className="w-12 h-12 text-default-600" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No Applicants Yet
              </h3>
              <p className="text-default-600 mb-6">
                When candidates apply for interviews, they'll appear here with
                their details and interview history.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-full">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Applicants</h1>
            <p className="text-default-600">
              {filteredApplicants.length} total applicants in your workspace
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <Card shadow="sm" className="p-2">
        <CardBody>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Input
              placeholder="Search by name or email..."
              value={searchValue}
              onValueChange={setSearchValue}
              startContent={<Search className="w-4 h-4 text-default-600" />}
              className="max-w-sm"
              variant="bordered"
            />
            <div className="flex items-center gap-2">
              <Chip
                color="primary"
                variant="flat"
                startContent={<Users className="w-4 h-4" />}
              >
                {filteredApplicants.length} Applicants
              </Chip>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Applicants Table */}
      <Card shadow="sm" className="p-2">
        <CardBody>
          <Table
            aria-label="Applicants table"
            removeWrapper
            classNames={{
              th: "bg-content2 text-default-700 font-semibold",
              td: "py-4",
            }}
          >
            <TableHeader>
              <TableColumn>APPLICANT</TableColumn>
              <TableColumn>CONTACT INFO</TableColumn>
              <TableColumn>DETAILS</TableColumn>
              <TableColumn>INTERVIEWS</TableColumn>
              <TableColumn>ACTIONS</TableColumn>
            </TableHeader>
            <TableBody>
              {paginatedApplicants.map((applicant) => (
                <TableRow key={applicant.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar
                        showFallback
                        name={`${applicant.firstName} ${applicant.lastName}`}
                        size="md"
                        className="bg-secondary/20 text-secondary"
                      />
                      <div>
                        <p className="font-semibold text-foreground">
                          {applicant.firstName} {applicant.lastName}
                        </p>
                        <p className="text-sm text-default-600">
                          Added{" "}
                          {format(
                            new Date(applicant.createdAt || Date.now()),
                            "MMM dd, yyyy",
                          )}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-default-600" />
                        <span className="text-foreground">
                          {applicant.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-default-600" />
                        <span className="text-foreground">
                          {applicant.phone}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-default-600">Age:</span>
                        <span className="text-sm font-medium text-foreground">
                          {applicant.age}
                        </span>
                      </div>
                      {getGenderChip(applicant.gender || "")}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getInterviewsChip(applicant.interviewIds?.length || 0)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {applicant.cvUrl && (
                        <Button
                          isIconOnly
                          size="sm"
                          variant="flat"
                          color="secondary"
                          as="a"
                          href={applicant.cvUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        as={Link}
                        href={`/app/interviews?applicantId=${applicant.id}`}
                      >
                        View Interviews
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center py-4">
              <Pagination
                total={totalPages}
                page={page}
                onChange={setPage}
                color="primary"
                showControls
              />
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
