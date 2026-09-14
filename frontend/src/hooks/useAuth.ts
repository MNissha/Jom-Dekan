import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authService } from "../service/authService";
import { useAuthStore } from "../store/useAuthStore";
import type {
  ForgotPasswordFormValues,
  LoginFormValues,
  RegisterFormValues,
} from "../schemas/authSchemas";

export function useCurrentUser() {
  return useAuthStore((s) => s.user);
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: LoginFormValues) => authService.login(values),
    onSuccess: (data) => {
      setSession(data.accessToken, data.user);
      queryClient.invalidateQueries();
      navigate("/dashboard");
    },
  });
}

export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (values: RegisterFormValues) =>
      authService.register({
        email: values.email,
        password: values.password,
        displayName: values.displayName,
        academicRole: values.academicRole,
        universityId: values.universityId,
        fieldOfStudy: values.fieldOfStudy,
        currentYear: values.currentYear,
        currentSemester: values.currentSemester,
        termsAccepted: values.termsAccepted,
      }),
    onSuccess: (data) => {
      setSession(data.accessToken, data.user);
      navigate(data.user.role === "ADMIN" ? "/admin" : "/dashboard");
    },
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (values: { token: string }) => authService.verifyEmail(values),
  });
}

export function useLogout() {
  const clearSession = useAuthStore((s) => s.clearSession);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // `reason` (e.g. "idle") is only ever used to annotate the redirect
  // below — it never changes what the logout call itself does.
  return useMutation<void, unknown, "idle" | undefined>({
    mutationFn: () => authService.logout(),
    onSettled: (_data, _error, reason) => {
      clearSession();
      queryClient.clear();
      navigate(reason ? `/login?reason=${reason}` : "/login");
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (values: ForgotPasswordFormValues) =>
      authService.forgotPassword(values),
  });
}

export function useResetPassword() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (values: { token: string; newPassword: string }) =>
      authService.resetPassword(values),
    onSuccess: () => {
      navigate("/login");
    },
  });
}
