# Student Support Ticket Management System

A support operations system for managing student support tickets, staff assignments, users, and SLA policies.

The project provides role-based access for **ADMIN, STAFF, and STUDENT** users. Authentication is handled through bearer tokens, while ticket access and actions are restricted based on the user's role and ownership.

All timestamps are handled in **UTC**, and SLA calculations use **calendar minutes** as defined by the requirements.

---

## Tech Stack

### Backend

* NestJS
* TypeScript
* TypeORM
* PostgreSQL
* REST APIs
* JWT Authentication
* Swagger / OpenAPI

### Frontend

* React.js
* TypeScript
* Tailwind CSS

---

## Problem Understanding

The main objective was to build a small but realistic support system rather than only implementing CRUD screens.

The important part of the problem was defining **what each role is allowed to do**:

| Role    | Main Responsibilities                            |
| ------- | ------------------------------------------------ |
| STUDENT | Register/login and access only their own tickets |
| STAFF   | Claim and work on tickets assigned to them       |
| ADMIN   | Manage users and SLA policies                    |

This means authorization cannot be handled only in the frontend. The backend must also verify the user's role and ownership before allowing an operation.

---

## Core Functionality

### Authentication

Users can register and log in to the system.

After successful authentication, the API returns a bearer token which is used for protected requests.

Protected APIs validate:

* Authentication token
* User role
* Resource ownership
* Allowed operation for that role

### Ticket Management

The ticket workflow is designed around the different responsibilities of students and support staff.

Students can work with their own tickets, while staff members can claim and work on tickets assigned to them.

The backend handles authorization rather than relying on the UI to hide unavailable actions.

### User Management

Administrative users can manage users according to the system requirements.

Access to administrative operations is restricted at the API level.

### SLA Management

Admins can create and manage SLA policies.

SLA calculations are based on **calendar minutes**, and timestamps are treated as UTC to avoid different results caused by local machine timezones.

---

# Architecture

The overall request flow is:

```text
React Frontend
      │
      │ REST API
      ▼
NestJS Backend
      │
      ├── Authentication / Authorization
      ├── Users
      ├── Tickets
      └── SLA Policies
      │
      ▼
TypeORM
      │
      ▼
PostgreSQL
```

The frontend is responsible for the user interface and API communication, while the backend is responsible for validation, authorization, business rules, and database operations.

I intentionally kept the architecture as a modular monolith instead of introducing microservices because the project scope does not justify the additional operational complexity.

---

# Important Engineering Decisions

## Role-based authorization on the backend

One important assumption was that hiding buttons in React is not sufficient for security.

For example, even if a student does not see an admin action in the UI, the student should still receive an unauthorized response if they manually call that endpoint.

Because of this, role and ownership checks are implemented on the backend.

---

## UTC-based timestamps

The application uses UTC for timestamps instead of relying on the local timezone of the machine running the application.

This avoids situations where:

```text
Frontend timezone != Backend timezone != Database timezone
```

which can otherwise produce inconsistent ticket and SLA timings.

---

## Calendar-minute SLA calculation

The requirement specifies calendar minutes, so SLA calculations do not try to interpret weekends or business working hours unless explicitly required.

This keeps the implementation aligned with the given requirement instead of introducing additional assumptions.

---

## REST API approach

I used REST APIs because the application mainly performs standard operations around users, tickets, authentication, and SLA policies.

For the current scope, REST keeps the implementation easier to understand, test, and maintain without introducing unnecessary complexity such as GraphQL or event-driven communication.

---

# Validation & Edge Cases

I considered validation at both the API and UI levels, with the backend treated as the final source of truth.

Some important cases include:

### Authentication

* Missing authentication token
* Invalid or expired token
* Invalid login credentials
* Accessing protected endpoints without authentication

### Authorization

* Student trying to access another student's ticket
* Student attempting administrative operations
* Staff attempting admin-only operations
* Users attempting operations outside their allowed role

### Ticket handling

* Invalid ticket identifiers
* Attempting to modify a ticket that does not belong to the user
* Invalid ticket state transitions
* Multiple staff members attempting to work on the same ticket

### SLA handling

* Invalid SLA configuration
* Missing required SLA values
* Incorrect or inconsistent timestamps
* Timezone-related calculation issues

### API validation

* Missing required fields
* Incorrect data types
* Invalid request payloads
* Non-existent database records

### Error response format

The API uses a consistent error structure:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

This keeps error handling predictable for the frontend and easier to debug during API testing.

---

# Validation Approach

I did not treat the generated implementation as finished code.

After the initial implementation, I validated the application by checking the actual interaction between the frontend and backend.

I tested API flows independently and then tested the same flows from the UI.

For example, I verified:

```text
Login
  ↓
Receive token
  ↓
Send token with protected request
  ↓
Backend validates token
  ↓
Role/ownership validation
  ↓
Business logic
  ↓
Database operation
  ↓
Response to frontend
```

This helped identify implementation mismatches that would not necessarily be visible by looking at the generated code alone.

---

# Trade-offs

### TypeORM

TypeORM was chosen because the project uses PostgreSQL and the rest of the backend is written in TypeScript.

It allows entities, relationships, and database operations to remain close to the application's TypeScript models.

The trade-off is that ORM abstractions can sometimes hide the actual SQL being executed, so database queries and relationships still need to be reviewed carefully.

### Modular monolith

I intentionally did not split the application into microservices.

For this project size, microservices would add deployment, communication, and debugging complexity without providing a meaningful benefit.

### JWT authentication

JWT makes the API convenient for a frontend/backend architecture because the token can be sent with each protected request.

The trade-off is that token lifecycle and expiration need to be handled properly rather than assuming that a token is always valid.

---

# AI / Tool Usage Report

AI was used as a development assistant, but I did not treat the generated output as the final implementation.

I used different tools for different parts of the development process.

### AI TOOLS USED

* **ChatGPT** — research, requirement analysis, architecture planning, API design, edge-case analysis, and documentation
* **OpenAI Codex** — backend implementation
* **Antigravity** — frontend implementation
* **Claude Sonnet** — used inside Antigravity
* **Gemini 3.7 Flash** — used in Antigravity after the Claude Sonnet usage limit was reached

For Codex, I used the **GPT-6 Astra** model.

---

## WHAT I ASKED AI TO DO

### 1. Requirement analysis and architecture

I first used ChatGPT to break down the requirements before starting implementation.

I asked it to help define:

* Application architecture
* Frontend and backend responsibilities
* Module and folder structure
* API endpoints
* Authentication and authorization flow
* Role-specific operations
* SLA handling
* Validation rules
* Important edge cases
* Possible failure scenarios

The goal was to have a clear implementation plan before generating the actual project.

### 2. Backend implementation

After preparing the architecture and implementation plan, I provided the context to Codex and used it to build the backend from a fresh project.

The generated backend included the initial project structure, NestJS modules, APIs, entities, validation, and database integration.

### 3. Frontend implementation

I provided the same overall product and API context to Antigravity and used it to build the React frontend and connect it with the backend APIs.

After the initial implementation, I reviewed and modified the generated code rather than accepting it unchanged.

---

# PROMPT THAT WAS MOST USEFUL

The most useful prompt was the architecture-focused request I prepared before implementation.

> Based on the complete product requirements, design a practical implementation architecture for the application. Define the frontend and backend responsibilities, project folder structure, API endpoints, authentication and authorization flow, database entities and relationships, validation rules, important edge cases, and the expected interaction between frontend and backend. Keep the architecture realistic for the project scope and explain important implementation decisions before writing code.

This was useful because it gave me a clear technical direction before moving into implementation.

---

# CODE GENERATED BY AI

The initial foundation of both applications was generated with AI.

This included a large part of:

* Backend project setup
* NestJS module structure
* Controllers and services
* Entities and TypeORM integration
* Initial API implementation
* React application structure
* API integration
* Initial UI implementation

However, I treated this as the starting point rather than the final solution.

After generation, I reviewed the implementation, tested the flows, and made changes based on the actual requirements and behavior of the application.

---

# CODE I MODIFIED

One visible example was the frontend styling.

I had specifically planned to use **Tailwind CSS**, but part of the generated frontend implementation used external CSS files instead.

I changed that implementation to use Tailwind so that the actual code matched the intended project stack and styling approach.

I also modified parts of the:

* Authentication API integration
* SLA API integration
* Frontend/backend request handling
* API payload handling
* Validation behavior

These changes were made after reviewing the generated implementation against the actual API contract and requirements.

---

# AI OUTPUT THAT WAS WRONG

One issue was that some generated frontend/backend implementations did not completely match the implementation contract I had defined during the architecture phase.

For example, the frontend could be implemented against an expected request or response structure while the backend implementation used a slightly different structure.

Another case was implementation choice rather than a runtime bug: the generated frontend used external CSS even though the planned implementation was Tailwind CSS.

I also found that some generated code looked correct at first glance but needed changes after testing the complete request flow rather than only reviewing individual files.

---

# HOW I IDENTIFIED THE PROBLEM

I identified these issues through normal developer validation rather than assuming that generated code was correct.

I compared:

```text
Requirement
   ↓
API contract
   ↓
Backend implementation
   ↓
Frontend request
   ↓
Actual API response
   ↓
UI behaviour
```

When something did not line up, I traced the request from the frontend to the controller, service, and database layer.

I also tested the APIs independently and checked the browser/network requests to verify the actual payload and response instead of relying only on what the generated code appeared to be doing.

This was important because AI-generated code can be internally consistent while still being inconsistent with the original product requirement.

---

# HOW I FIXED IT

I corrected the implementation by going back to the API contract and tracing the complete flow.

For API-related issues, I updated the frontend request/response handling or backend endpoint implementation so both sides followed the same contract.

For the styling issue, I replaced the generated external CSS approach with Tailwind-based styling as originally planned.

I then retested the affected flow from both the API side and the frontend to make sure the change did not only fix the immediate issue but also worked correctly across the complete flow.

The main lesson from the AI-assisted development process was that generated code is useful for accelerating implementation, but it still needs to be reviewed, tested, and adapted to the actual product requirements.

---

# What I Took Away From Using AI

AI significantly reduced the time required to create the initial project structure and implementation.

However, the important engineering work was still in understanding what was generated, checking whether it matched the requirements, identifying mismatches, and modifying the implementation when necessary.

My workflow was therefore:

```text
Understand requirement
        ↓
Design architecture
        ↓
Use AI to accelerate implementation
        ↓
Review generated code
        ↓
Run and test application
        ↓
Find mismatches / edge cases
        ↓
Modify implementation
        ↓
Retest
```

I used AI as a development accelerator, not as a replacement for validating the solution.

---

# Final Notes

The project was developed with a focus on:

* Clear separation between frontend and backend
* Role-based access control
* Consistent API behavior
* Reliable database interaction
* UTC-based time handling
* SLA calculation based on the specified rules
* Validation of edge cases
* Practical architecture for the current project size

The main goal was not simply to make the application work for the happy path, but to make the behavior predictable when users provide invalid input, access resources they should not have access to, or when frontend and backend expectations do not match.
