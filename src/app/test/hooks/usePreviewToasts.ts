import { useEffect } from "react";
import { toast } from "react-toastify";

export function usePreviewToasts(isPreview: boolean) {
  useEffect(() => {
    if (!isPreview) {
      return;
    }
    const previewToastsShownRef = { current: false };
    if (previewToastsShownRef.current) {
      return;
    }
    previewToastsShownRef.current = true; // prevent StrictMode double effect
    try {
      toast.info("Tip: Use the delete icon on a question to replace it.", { autoClose: 6000 });
      setTimeout(() => {
        toast.info('When finished, click "Send Test" at the bottom to assign.', {
          autoClose: 6000,
        });
      }, 1200);
    } catch {
      // Ignore timeout errors
    }
  }, [isPreview]);
}
