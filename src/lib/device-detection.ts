export const isMobileDevice = (): boolean => {
  if (typeof window === "undefined") return false;

  const userAgent = navigator.userAgent;
  const mobileRegex =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

  // Check user agent
  const isMobileUserAgent = mobileRegex.test(userAgent);

  // Check screen size
  const isSmallScreen = window.innerWidth <= 768;

  // Check touch support
  const isTouchDevice =
    "ontouchstart" in window || navigator.maxTouchPoints > 0;

  return isMobileUserAgent || (isSmallScreen && isTouchDevice);
};

export const isDesktopDevice = (): boolean => {
  return !isMobileDevice();
};

export const hasCamera = async (): Promise<boolean> => {
  if (typeof navigator === "undefined" || !navigator.mediaDevices) return false;

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some((device) => device.kind === "videoinput");
  } catch {
    return false;
  }
};

export const getCameraPermissionStatus = async (): Promise<
  "granted" | "denied" | "prompt" | "unknown"
> => {
  if (typeof navigator === "undefined" || !navigator.permissions)
    return "unknown";

  try {
    const permission = await navigator.permissions.query({
      name: "camera" as PermissionName,
    });
    return permission.state;
  } catch {
    return "unknown";
  }
};
