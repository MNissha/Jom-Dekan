import { useMutation } from "@tanstack/react-query";
import { supportRequestService } from "../service/supportRequestService";
import { useToast } from "../context/ToastContext";

export function useSubmitSupportRequest() {
  const toast = useToast();

  return useMutation({
    mutationFn: supportRequestService.submit,
    onSuccess: (_data, variables) => {
      toast.success(
        variables.type === "SUGGESTION"
          ? "Thanks for the suggestion — our team will take a look!"
          : "Support request submitted — we'll get back to you soon.",
      );
    },
  });
}
