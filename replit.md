# LeadFollow - Prospect Management and Follow-Up System

## Overview
LeadFollow is a web application designed to help users manage prospects and automate follow-ups through Gmail integration. The application allows tracking customer interactions, automating timely follow-ups, and managing customer relationships effectively.

Preferred communication style: Simple, everyday language.

## User Preferences
- **Responsive Design**: The application should be fully responsive and work well on both desktop and mobile devices
- **Clean UI**: Utilize the shadcn/ui components consistently throughout the application
- **Intuitive Workflow**: Keep the user experience straightforward with clear navigation and action paths
- **Fast Performance**: Ensure quick load times and responsive interactions

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React Query for server state and local React state for UI
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Theme Support**: Light/dark mode via ThemeProvider

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Authentication**: Session-based authentication with Passport.js
- **API Structure**: RESTful API endpoints for all data operations
- **External Integration**: Gmail API for email processing and synchronization
- **Middleware**: Custom middleware for logging, authentication, and error handling

### Data Layer
- **Database**: PostgreSQL (accessed via Drizzle ORM)
- **Schema**: Defined in shared/schema.ts with tables for users, prospects, emails, follow-ups
- **Data Access**: Abstracted through a storage interface (server/storage.ts)

### Authentication Flow
- Session-based authentication using express-session
- Password hashing with bcryptjs
- OAuth2 flow for Gmail integration

## Key Components

### Frontend Components
1. **Layout Components**:
   - Header: Application header with navigation and user info
   - Sidebar: Primary navigation with links to main sections
   - Main content area: Dynamic based on current route

2. **Page Components**:
   - Dashboard: Overview of key metrics and pending actions
   - Prospects: List and detail views for prospect management
   - FollowUps: Management of scheduled follow-up communications
   - Settings: User and application configuration

3. **UI Components**:
   - Comprehensive set of shadcn/ui components
   - Custom modals for specific workflows (e.g., FollowUpModal, GmailIntegrationModal)

### Backend Components
1. **API Routes**:
   - Authentication endpoints (/api/auth/*)
   - Prospect management (/api/prospects/*)
   - Follow-up management (/api/follow-ups/*)
   - Gmail integration (/api/gmail/*)

2. **Services**:
   - Gmail integration service
   - Authentication service
   - Storage service for database operations

3. **Middleware**:
   - Authentication middleware
   - Logging middleware
   - Error handling middleware

## Data Flow

### Authentication Flow
1. User submits login credentials via the Auth component
2. Backend validates credentials and establishes a session
3. Frontend stores authentication state and enables protected routes

### Prospect Management Flow
1. User creates/edits prospect data via the Prospects component
2. Data is validated client-side with zod schemas
3. API requests update the database via the storage interface
4. UI is updated through React Query cache management

### Gmail Integration Flow
1. User connects Gmail account through OAuth2 flow
2. Application stores refresh token for ongoing access
3. Periodic synchronization pulls email data for connected prospects
4. Email data is processed and stored for follow-up management

### Follow-Up Management Flow
1. System identifies prospects requiring follow-up based on rules
2. User manages follow-ups through the FollowUps component
3. Completed follow-ups update prospect status
4. New follow-ups can be scheduled manually or based on rules

## External Dependencies

### Frontend Dependencies
- React and React DOM for UI
- Tailwind CSS for styling
- shadcn/ui components (via Radix UI primitives)
- React Query for data fetching
- Wouter for routing
- Zod for schema validation
- React Hook Form for form handling

### Backend Dependencies
- Express.js for server framework
- Drizzle ORM for database access
- Passport.js for authentication
- Google APIs for Gmail integration
- bcryptjs for password hashing
- express-session for session management

### Development Dependencies
- TypeScript for type safety
- Vite for frontend bundling
- esbuild for backend bundling
- Drizzle Kit for database migrations

## Deployment Strategy
- **Development**: Local development server with hot-reloading
- **Production**: 
  1. Build step creates optimized frontend assets and bundled backend
  2. Server serves static assets and API endpoints
  3. Database connections utilize connection pooling for efficiency
- **CI/CD**: Replit workflows for automated deployment

## Database Schema
The application uses PostgreSQL with the following core tables:
- **users**: Store user account information
- **prospects**: Track prospect contact information and status
- **emails**: Record email communications with prospects
- **followUps**: Manage scheduled follow-up actions
- **followUpSettings**: Configure automated follow-up rules

## Environment Configuration
Required environment variables:
- **DATABASE_URL**: PostgreSQL connection string
- **SESSION_SECRET**: Secret for session encryption
- **GOOGLE_CLIENT_ID**: OAuth2 client ID for Gmail integration
- **GOOGLE_CLIENT_SECRET**: OAuth2 client secret
- **GOOGLE_REDIRECT_URI**: OAuth2 redirect URI

## Development Guidelines
- Follow TypeScript best practices for type safety
- Use React Query for all data fetching and mutations
- Implement proper error handling and loading states
- Maintain consistent UI styling using shadcn/ui components
- Keep shared code in the shared directory for reuse between frontend and backend