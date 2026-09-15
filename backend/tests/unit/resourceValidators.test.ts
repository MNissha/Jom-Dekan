import {
  createTextResourceSchema,
  createUploadIntentSchema,
} from "../../src/validators/resourceValidators";

describe("resource category validation", () => {
  it("accepts EXERCISES for text resources", () => {
    const result = createTextResourceSchema.safeParse({
      title: "Practice questions",
      description: "A complete set of practice exercises for revision.",
      category: "EXERCISES",
    });

    expect(result.success).toBe(true);
  });

  it("accepts EXERCISES for uploaded resources", () => {
    const result = createUploadIntentSchema.safeParse({
      title: "Tutorial exercises",
      category: "EXERCISES",
      fileName: "tutorial.pdf",
      contentType: "application/pdf",
      sizeBytes: 1024,
    });

    expect(result.success).toBe(true);
  });
});
