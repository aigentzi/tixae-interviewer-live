import { useState } from "react";
import { useDropzone, DropzoneOptions } from "react-dropzone";
import { getBunnyUploadUrl, uploadImageToBunny } from "@root/shared/utils";
import axios from "axios";

export const useUploader = (folderName: string, options?: {
  onSuccess?: (url: string, file?: File) => void;
  onError?: (error: any) => void;
  onProgress?: (progress: number) => void;
  accept?: DropzoneOptions["accept"];
  maxSize?: DropzoneOptions["maxSize"];
  maxFiles?: DropzoneOptions["maxFiles"];
  directUpload?: boolean;
  customUpload?: (file: File) => Promise<any>;
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: options?.accept,
    maxFiles: options?.maxFiles,
    maxSize: options?.maxSize,
    disabled: uploading,
    onDrop: async (acceptedFiles) => {
      try {
        const file = acceptedFiles[0];

        setUploading(true);
        setUploadProgress(0);

        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + 10, 90));
        }, 200);

        if (options?.customUpload) {
          const url = await options.customUpload(file);
          options?.onSuccess?.(url, file);
          clearInterval(progressInterval);
          setUploading(false);
          return;
        }

        if (options?.directUpload) {
          const viewUrl = await uploadImageToBunny({
            file,
            params: {
              folder: folderName,
            },
            compressionOptions: {
              maxSizeMB: 1,
              useWebWorker: true,
              initialQuality: 0.8,
            },
            onProgress: (percent) => {
              setUploadProgress(percent);
              console.log(`Upload progress: ${percent}%`);
              options?.onProgress?.(percent);
            },
          });
          options?.onSuccess?.(viewUrl || "", file);
        } else {
          const presignedUrl = await getBunnyUploadUrl(file, folderName);
          await axios.put(presignedUrl.uploadUrl || "", file, {
            headers: {
              "Content-Type": file.type,
              "AccessKey": process.env.NEXT_PUBLIC_BUNNY_CDN_PASSWORD,
            },
            onUploadProgress: (e) => {
              if (e.total) {
                const percent = Math.round((e.loaded * 100) / e.total);
                setUploadProgress(percent);
                options?.onProgress?.(percent);
              }
            },
          });
          options?.onSuccess?.(presignedUrl.viewUrl || "", file);
        }
      } catch (error) {
        options?.onError?.(error);
      } finally {
        setUploading(false);
      }
    },
  });

  return {
    uploading,
    uploadProgress,
    setUploading,
    setUploadProgress,
    getRootProps,
    getInputProps,
    isDragActive,
  };
};
