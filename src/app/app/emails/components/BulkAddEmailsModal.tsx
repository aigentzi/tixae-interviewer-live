import { Select, SelectItem } from "@heroui/react";
import { AppModal } from "@root/app/components/AppModal";
import { Email, JobProfile } from "@root/shared/zod-schemas";
import { CloudUpload } from "lucide-react";
import { FC, useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import InlineNotification from "@root/app/components/InlineNotification";

export const BulkAddEmailsModal: FC<{
  isModalOpen: boolean;
  setIsModalOpen: (isModalOpen: boolean) => void;
  onSubmit: (emails: Email[], jobProfileId: string) => void;
  jobProfiles: JobProfile[];
}> = ({ isModalOpen, setIsModalOpen, onSubmit, jobProfiles }) => {
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
  } | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedJobProfile, setSelectedJobProfile] =
    useState<JobProfile | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log("acceptedFiles", acceptedFiles);
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadedFile({
      name: file.name,
      size: file.size,
    });

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = text.split("\n");

        if (rows.length < 2) {
          setNotification({
            type: "error",
            message: "CSV file is invalid or empty",
          });
          setIsProcessing(false);
          return;
        }

        const headers = rows[0].split(",").map((header) => header.trim());
        const requiredHeaders = ["email"];

        const missingHeaders = requiredHeaders.filter(
          (header) => !headers.includes(header)
        );

        if (missingHeaders.length > 0) {
          setNotification({
            type: "error",
            message: `Missing required headers: ${missingHeaders.join(", ")}`,
          });
          setIsProcessing(false);
          return;
        }

        const parsedRows = rows
          .slice(1)
          .filter((row) => row.trim())
          .map((row) => {
            const values = row.split(",").map((cell) => cell.trim());
            const email: Email = {} as Email;
            headers.forEach((header, index) => {
              email[header as keyof Email] = values[index] || "";
            });
            return email;
          });

        setEmails(parsedRows);
        setIsProcessing(false);
      } catch (error) {
        setNotification({ type: "error", message: "Error parsing CSV file" });
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setNotification({ type: "error", message: "Error reading file" });
      setIsProcessing(false);
    };

    reader.readAsText(file);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!selectedJobProfile) {
      setNotification({
        type: "error",
        message: "Please select a job profile",
      });
      return;
    }
    onSubmit(emails, selectedJobProfile.id);
    setIsModalOpen(false);
    setNotification({ type: "success", message: "Emails added successfully" });
  }, [selectedJobProfile, onSubmit, emails, setIsModalOpen]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  });

  return (
    <AppModal
      isModalOpen={isModalOpen}
      setIsModalOpen={setIsModalOpen}
      title="Bulk Add Emails"
      description="Add multiple emails at once"
      onSubmit={handleSubmit}
      footerButtonText="Add Emails"
    >
      <div className="flex flex-col gap-2">
        {notification && (
          <InlineNotification
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification(null)}
          />
        )}
        <p className="text-sm text-foreground-500">
          You must choose job Profile for the emails to be added to
        </p>
        <Select
          selectedKeys={[selectedJobProfile?.id.toString() || ""]}
          onSelectionChange={(value) => {
            setSelectedJobProfile(
              jobProfiles.find(
                (jobProfile) => jobProfile.id.toString() === value.currentKey
              ) || null
            );
          }}
        >
          {jobProfiles.map((jobProfile) => (
            <SelectItem key={jobProfile.id}>{jobProfile.name}</SelectItem>
          ))}
        </Select>
      </div>
      <section className="w-full mx-auto transition-all duration-500 text-foreground bg-content3 border border-foreground-300 rounded-lg">
        <div
          className={`flex w-full flex-col items-center justify-center gap-3 p-8 rounded-lg border-2 border-dashed ${
            isDragActive ? "border-primary" : "border-foreground-300"
          }`}
          {...getRootProps()}
        >
          <input {...getInputProps()} />
          <CloudUpload className="w-20 h-20 text-primary/60" />
          <div className="text-center">
            <p className="text-lg font-medium">Upload your leads as CSV</p>
            <p className="text-sm text-foreground-500 mt-1">
              Drag and drop your file here, or click to select
            </p>
          </div>
          <div className="text-xs text-warning-500 mt-2">
            NOTE: Maximum file size: 5MB
          </div>
        </div>
      </section>
    </AppModal>
  );
};
