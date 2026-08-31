const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const { NextRequest, NextResponse } = require("next/server");

const root = path.resolve(__dirname, "..");
const originalResolveFilename = Module._resolveFilename;
const originalLoad = Module._load;
const createdUsers = [];
let apiUserId = null;
let sequence = 0;

Module._resolveFilename = function(request, parent, isMain, options) {
  if (request.startsWith("@/")) return originalResolveFilename.call(this, path.join(root, request.slice(2)), parent, isMain, options);
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

Module._load = function(request, parent, isMain) {
  if (request === "@/lib/http") return { currentUserId: async () => apiUserId, error: (message, status) => NextResponse.json({ error: message }, { status }) };
  return originalLoad.call(this, request, parent, isMain);
};

require.extensions[".ts"] = function(module, filename) {
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  module._compile(output, filename);
};

const { prisma } = require(path.join(root, "lib", "prisma.ts"));
const { InvalidLoginInputError, LoginRateLimitError, authorizeCredentials } = require(path.join(root, "lib", "credential-authorize.ts"));
const { loginFormMessage } = require(path.join(root, "lib", "auth-messages.ts"));
const { POST } = require(path.join(root, "app", "api", "auth", "register", "route.ts"));
const { PATCH } = require(path.join(root, "app", "api", "profile", "route.ts"));

function unique(value) {
  sequence += 1;
  return `${value}-${Date.now()}-${sequence}`;
}

async function register(name, email, address = unique("127.0.0"), password = "password123") {
  const request = new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-real-ip": address },
    body: JSON.stringify({ name, email, password }),
  });
  const response = await POST(request);
  const body = await response.json();
  if (response.status === 201) createdUsers.push(body.id);
  return { response, body };
}

async function profile(userId, name, email) {
  apiUserId = userId;
  const request = new NextRequest("http://localhost/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email }),
  });
  const response = await PATCH(request);
  const body = await response.json();
  apiUserId = null;
  return { response, body };
}

test.after(async () => {
  apiUserId = null;
  if (createdUsers.length) await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
  await prisma.$disconnect();
});

test("a new email and username can register", async () => {
  const suffix = unique("new-account");
  const result = await register(`New ${suffix}`, `${suffix}@example.test`);
  assert.equal(result.response.status, 201);
  assert.equal(result.body.email, `${suffix}@example.test`);
});

test("duplicate email and duplicate username registrations are rejected", async () => {
  const suffix = unique("duplicate");
  const email = `${suffix}@example.test`;
  const name = `User ${suffix}`;
  assert.equal((await register(name, email)).response.status, 201);
  const emailConflict = await register(`Other ${suffix}`, email);
  assert.equal(emailConflict.response.status, 409);
  assert.equal(emailConflict.body.error, "This email is already registered. Try logging in or use a different email.");
  const nameConflict = await register(name, `other-${suffix}@example.test`);
  assert.equal(nameConflict.response.status, 409);
  assert.equal(nameConflict.body.error, "This username is already taken. Please choose another.");
  const bothConflict = await register(name, email);
  assert.equal(bothConflict.response.status, 409);
  assert.match(bothConflict.body.error, /email is already registered and this username is already taken/i);
});

test("registration returns clear validation messages without sensitive details", async () => {
  const suffix = unique("validation");
  const invalidEmail = await register(`Valid ${suffix}`, "not-an-email");
  assert.equal(invalidEmail.response.status, 400);
  assert.equal(invalidEmail.body.error, "Please enter a valid email address.");
  const invalidUsername = await register(" ", `username-${suffix}@example.test`);
  assert.equal(invalidUsername.response.status, 400);
  assert.equal(invalidUsername.body.error, "Please enter a username between 2 and 60 characters.");
  const invalidPassword = await register(`Password ${suffix}`, `password-${suffix}@example.test`, unique("127.0.0"), "short");
  assert.equal(invalidPassword.response.status, 400);
  assert.equal(invalidPassword.body.error, "Password must be between 8 and 72 characters.");
  assert.doesNotMatch(JSON.stringify(invalidPassword.body), /hash|token|password123/i);
});

test("case variants of email and username are rejected", async () => {
  const suffix = unique("case");
  const email = `${suffix}@example.test`;
  const name = `Case User ${suffix}`;
  assert.equal((await register(name, email)).response.status, 201);
  assert.equal((await register(`Email Case ${suffix}`, email.toUpperCase())).response.status, 409);
  assert.equal((await register(name.toUpperCase(), `name-case-${suffix}@example.test`)).response.status, 409);
});

test("concurrent registrations with the same email permit exactly one account", async () => {
  const suffix = unique("email-race");
  const email = `${suffix}@example.test`;
  const results = await Promise.all([
    register(`Email Race A ${suffix}`, email, `10.0.0.${sequence}`),
    register(`Email Race B ${suffix}`, email, `10.0.1.${sequence}`),
  ]);
  assert.deepEqual(results.map(result => result.response.status).sort(), [201, 409]);
});

test("concurrent registrations with the same username permit exactly one account", async () => {
  const suffix = unique("name-race");
  const name = `Name Race ${suffix}`;
  const results = await Promise.all([
    register(name, `name-race-a-${suffix}@example.test`, `10.0.2.${sequence}`),
    register(name.toUpperCase(), `name-race-b-${suffix}@example.test`, `10.0.3.${sequence}`),
  ]);
  assert.deepEqual(results.map(result => result.response.status).sort(), [201, 409]);
});

test("profile updates reject another user's email, username, and case variants", async () => {
  const suffix = unique("profile");
  const first = await register(`First ${suffix}`, `first-${suffix}@example.test`);
  const second = await register(`Second ${suffix}`, `second-${suffix}@example.test`);
  assert.equal(first.response.status, 201);
  assert.equal(second.response.status, 201);
  const emailConflict = await profile(first.body.id, `First Updated ${suffix}`, second.body.email);
  assert.equal(emailConflict.response.status, 409);
  assert.equal(emailConflict.body.error, "This email is already in use.");
  const nameConflict = await profile(first.body.id, second.body.name, `updated-${suffix}@example.test`);
  assert.equal(nameConflict.response.status, 409);
  assert.equal(nameConflict.body.error, "This username is already taken. Please choose another.");
  const emailCaseConflict = await profile(first.body.id, `First Case ${suffix}`, second.body.email.toUpperCase());
  assert.equal(emailCaseConflict.response.status, 409);
  const nameCaseConflict = await profile(first.body.id, second.body.name.toUpperCase(), `case-updated-${suffix}@example.test`);
  assert.equal(nameCaseConflict.response.status, 409);
  const invalidProfile = await profile(first.body.id, " ", "invalid-email");
  assert.equal(invalidProfile.response.status, 400);
  assert.equal(invalidProfile.body.error, "Please enter a valid email address.");
  const invalidProfileUsername = await profile(first.body.id, " ", `valid-${suffix}@example.test`);
  assert.equal(invalidProfileUsername.response.status, 400);
  assert.equal(invalidProfileUsername.body.error, "Please enter a username between 2 and 60 characters.");
  const successfulProfile = await profile(first.body.id, `Updated ${suffix}`, `updated-${suffix}@example.test`);
  assert.equal(successfulProfile.response.status, 200);
  assert.equal(successfulProfile.body.name, `Updated ${suffix}`);
});

test("login errors stay generic except safe validation and rate-limit feedback", async () => {
  const suffix = unique("login");
  const registered = await register(`Login ${suffix}`, `login-${suffix}@example.test`);
  assert.equal(registered.response.status, 201);
  const validRequest = { headers: new Headers({ "x-real-ip": `10.2.0.${sequence}` }) };
  const validUser = await authorizeCredentials({ email: registered.body.email, password: "password123" }, validRequest);
  assert.equal(validUser.id, registered.body.id);
  const invalidCredentials = await authorizeCredentials({ email: `missing-${suffix}@example.test`, password: "password123" }, { headers: new Headers({ "x-real-ip": `10.3.0.${sequence}` }) });
  assert.equal(invalidCredentials, null);
  assert.equal(loginFormMessage("credentials"), "Incorrect email or password.");
  await assert.rejects(() => authorizeCredentials({ email: "not-an-email", password: "password123" }, validRequest), error => error instanceof InvalidLoginInputError && error.code === "invalid_input");
  const rateEmail = `rate-${suffix}@example.test`;
  const rateRequest = { headers: new Headers({ "x-real-ip": `10.4.0.${sequence}` }) };
  for (let attempt = 0; attempt < 10; attempt += 1) await authorizeCredentials({ email: rateEmail, password: "password123" }, rateRequest);
  await assert.rejects(() => authorizeCredentials({ email: rateEmail, password: "password123" }, rateRequest), error => error instanceof LoginRateLimitError && error.code === "rate_limited");
  assert.equal(loginFormMessage("rate_limited"), "Too many login attempts. Please try again later.");
  assert.doesNotMatch(loginFormMessage("credentials"), /exist|account/i);
});
