import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "@/lib/validation/auth";
import { profileSchema } from "@/lib/validation/profile";

describe("registerSchema", () => {
  it("accepts a valid registration payload", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "password123",
      consent: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a password shorter than 10 characters", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "short1",
      consent: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password with no digit", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "onlylettersnodigits",
      consent: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects registration without consent", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "password123",
      consent: false,
    });
    expect(result.success).toBe(false);
  });

  it("lowercases and trims the email", () => {
    const result = registerSchema.safeParse({
      email: "  User@Example.com  ",
      password: "password123",
      consent: true,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("user@example.com");
  });
});

describe("loginSchema", () => {
  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "x" });
    expect(result.success).toBe(false);
  });
});

describe("profileSchema", () => {
  it("accepts a partial profile update", () => {
    const result = profileSchema.partial().safeParse({ city: "Paris", maxDistanceKm: 20 });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid contract type", () => {
    const result = profileSchema.safeParse({ contractTypes: ["NOT_A_REAL_CONTRACT"] });
    expect(result.success).toBe(false);
  });

  it("rejects a negative salary", () => {
    const result = profileSchema.safeParse({ minSalaryMonthly: -100 });
    expect(result.success).toBe(false);
  });
});
