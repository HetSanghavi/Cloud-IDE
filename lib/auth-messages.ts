export function loginFormMessage(code?: string): string {
  if (code === "rate_limited") {
    return "Too many login attempts. Please try again later.";
  }

  if (code === "invalid_input") {
    return "Please enter a valid email address and password.";
  }

  return "Incorrect email or password.";
}
