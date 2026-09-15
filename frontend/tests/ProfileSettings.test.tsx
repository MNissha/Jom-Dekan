import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Profile from "../src/pages/Profile";

const updateMutate = vi.fn();
const resetMutate = vi.fn();
const supportMutate = vi.fn();

vi.mock("../src/hooks/useProfile", () => {
  const profile = {
      id: "user-1",
      email: "student@example.com",
      role: "USER",
      emailVerified: true,
      termsAcceptedAt: null,
      displayName: "Nur Student",
      photoPath: null,
      phone: "+60123456789",
      academicRole: "STUDENT",
      university: { id: "university-1", name: "Universiti Teknologi MARA" },
      fieldOfStudy: "Computer Science",
      studyLevel: "DEGREE",
      currentYear: 2,
      currentSemester: 4,
      createdAt: "2026-01-01T00:00:00.000Z",
  };
  const stats = {
      resourceCount: 3,
      forumPostCount: 2,
      forumCommentCount: 4,
      tutorListingCount: 0,
      freelanceListingCount: 1,
      favoriteCount: 5,
  };

  return {
  useMyProfile: () => ({
    data: profile,
    isLoading: false,
  }),
  useMyStats: () => ({
    data: stats,
    isLoading: false,
  }),
  useUpdateProfile: () => ({
    mutate: updateMutate,
    isPending: false,
    isError: false,
    error: null,
  }),
  };
});

vi.mock("../src/hooks/useAuth", () => ({
  useForgotPassword: () => ({
    mutate: resetMutate,
    isPending: false,
  }),
}));

vi.mock("../src/hooks/useTaxonomy", () => ({
  useUniversities: () => ({
    data: [{ id: "university-1", name: "Universiti Teknologi MARA" }],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("../src/hooks/useSupportRequests", () => ({
  useSubmitSupportRequest: () => ({
    mutate: supportMutate,
    isPending: false,
  }),
}));

vi.mock("../src/hooks/useMinimumLoading", () => ({
  useMinimumLoading: () => false,
}));

function renderProfile(initialEntry = "/profile") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Profile & Settings hub", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows only settings backed by existing functionality", () => {
    renderProfile();

    expect(screen.getByRole("heading", { name: "Profile & Settings" })).toBeInTheDocument();
    expect(screen.getByText("Nur Student")).toBeInTheDocument();
    expect(screen.getByText("student@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Personal information/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Password & security/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Contact support/i })).toBeInTheDocument();
    expect(screen.queryByText("Delete account")).not.toBeInTheDocument();
    expect(screen.queryByText("Notification preferences")).not.toBeInTheDocument();
  });

  it("opens Contact Support inside Profile & Settings and returns to the hub", () => {
    renderProfile();

    fireEvent.click(screen.getByRole("button", { name: /Contact support/i }));
    expect(screen.getByRole("heading", { name: "Contact support" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Subject/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Message/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Profile & Settings" }));
    expect(screen.getByRole("heading", { name: "Profile & Settings" })).toBeInTheDocument();
  });

  it("submits the existing support payload", () => {
    renderProfile("/profile?section=contact");

    fireEvent.change(screen.getByLabelText(/Subject/i), {
      target: { value: "Cannot download a resource" },
    });
    fireEvent.change(screen.getByLabelText(/Message/i), {
      target: { value: "The download button returns an error." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));

    expect(supportMutate).toHaveBeenCalledWith(
      {
        type: "SUPPORT",
        subject: "Cannot download a resource",
        message: "The download button returns an error.",
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
