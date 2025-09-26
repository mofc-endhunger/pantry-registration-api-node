# Pantry Registration API

A NestJS-based REST API for user registration and authentication in the Pantry system, built with TypeScript and designed to run on AWS EKS/ECS.

## Prerequisites

- Node.js 22+
- Docker and Docker Compose
- Access to remote MySQL database
- npm package manager

## Local Development Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd pantry-registration-api-node
```

### 2. Install dependencies

```bash
npm ci
```

### 3. Configure environment variables

Copy the example environment file and update with your MySQL credentials:

```bash
cp .env.example .env
```

Edit `.env` and update the following variables:

```env
# Application Environment
NODE_ENV=development
PORT=3000

# MySQL Database Configuration
DB_HOST=your-mysql-host.amazonaws.com
DB_PORT=3306
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_DATABASE=your_database_name
```

### 4. Run with Docker Compose (Recommended)

Docker Compose provides a consistent development environment:

```bash
# Start the application
docker-compose up

# Start with rebuild
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop the application
docker-compose down
```

### 5. Run without Docker

If you prefer to run the application directly:

```bash
# Development mode with hot-reload
npm run start:dev

# Production mode
npm run start:prod

# Standard mode
npm run start
```

## Available Scripts

### Development

- `npm run start` - Start application
- `npm run start:dev` - Start in watch mode (hot-reload)
- `npm run start:prod` - Start production build

### Build

- `npm run build` - Build the application

### Code Quality

- `npm run lint` - Run ESLint on TypeScript files

## API Documentation (Swagger)

The Pantry Registration API includes interactive API documentation using Swagger UI.

### Accessing Swagger UI

1. Start the server:

```bash
npm run start:dev
```

2. Open your browser and navigate to:

[http://localhost:3000/api-docs](http://localhost:3000/api-docs)

This will display the interactive Swagger UI with all available authentication and registration endpoints.

## Project Structure

```
src/
├── main.ts                          # Application entry point
├── app.module.ts                    # Root application module
├── entities/                        # TypeORM entities (database models)
│   ├── authentication.entity.ts    # Authentication model
│   ├── credential.entity.ts        # User credentials
│   ├── identity.entity.ts          # User identity
│   ├── password-reset-token.entity.ts # Password reset tokens
│   ├── user.entity.ts              # User model
│   ├── user-detail.entity.ts       # User details
│   └── index.ts                    # Entity exports
├── config/
│   └── database.config.ts          # Database configuration
├── modules/                         # Feature modules
│   ├── auth/                       # Authentication module
│   │   ├── auth.controller.ts      # Auth endpoints
│   │   ├── auth.service.ts         # Auth business logic
│   │   ├── auth.module.ts          # Auth module definition
│   │   ├── dto/                    # Data transfer objects
│   │   └── strategies/             # Passport authentication strategies
│   ├── auth-callbacks/             # Authentication callbacks
│   ├── guest-authentications/      # Guest authentication
│   └── users/                      # User management
│       ├── users.controller.ts     # User endpoints
│       ├── users.service.ts        # User business logic
│       └── users.module.ts         # User module definition
└── providers/
    └── database/                    # Database connection provider

test/
└── *.spec.ts                       # Test files
```

### Key API Endpoints

The API provides comprehensive authentication and user management endpoints:

#### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/logout` - User logout
- `POST /auth/forgot-password` - Initiate password reset
- `POST /auth/reset-password` - Complete password reset

#### User Management

- `GET /users/profile` - Get current user profile
- `PUT /users/profile` - Update user profile
- `GET /users/:id` - Get user by ID (admin)
- `PUT /users/:id` - Update user by ID (admin)
- `DELETE /users/:id` - Delete user (admin)

#### Guest Authentication

- `POST /guest-auth/register` - Register as guest
- `POST /guest-auth/convert` - Convert guest to full user

## Authentication & Security

The API uses JWT (JSON Web Tokens) for authentication with Passport.js strategies:

- **JWT Strategy**: For protecting routes requiring authentication
- **Bcrypt**: For password hashing and verification
- **Token Refresh**: Automatic token refresh mechanism
- **Password Reset**: Secure password reset flow with temporary tokens

### JWT Token Usage

Include the JWT token in request headers:

```bash
Authorization: Bearer <your-jwt-token>
```

## Database

The API uses TypeORM with MySQL for data persistence. The database schema includes:

- Users and user details
- Authentication credentials
- Identity verification
- Password reset tokens
- Authentication sessions

### Database Migrations

TypeORM handles database synchronization. In production, use migrations:

```bash
# Generate a migration
npm run typeorm migration:generate -- -n MigrationName

# Run migrations
npm run typeorm migration:run

# Revert last migration
npm run typeorm migration:revert
```

## Docker Commands

### Development

```bash
# Access container shell
docker-compose exec app bash

# Run linting inside container
docker-compose exec app npm run lint

# View container logs
docker-compose logs -f app
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run end-to-end tests
npm run test:e2e
```

### Test Organization

Tests are organized alongside their respective modules:

- Unit tests: `*.spec.ts` files next to source files
- Integration tests: `*.integration.spec.ts`
- E2E tests: `/test` directory

## Environment Variables

### Required Variables

| Variable      | Description             | Example                         |
| ------------- | ----------------------- | ------------------------------- |
| `NODE_ENV`    | Application environment | `development`, `production`     |
| `PORT`        | Server port             | `3000`                          |
| `DB_HOST`     | MySQL host              | `localhost` or AWS RDS endpoint |
| `DB_PORT`     | MySQL port              | `3306`                          |
| `DB_USERNAME` | Database username       | `admin`                         |
| `DB_PASSWORD` | Database password       | `secure_password`               |
| `DB_DATABASE` | Database name           | `pantry_registration`           |

### Optional Variables

| Variable                    | Description                     | Default        |
| --------------------------- | ------------------------------- | -------------- |
| `JWT_SECRET`                | Secret for JWT signing          | Auto-generated |
| `JWT_EXPIRATION`            | Token expiration time           | `1h`           |
| `REFRESH_TOKEN_EXPIRATION`  | Refresh token expiration        | `7d`           |
| `PASSWORD_RESET_EXPIRATION` | Password reset token expiration | `1h`           |
| `CORS_ORIGIN`               | Allowed CORS origins            | `*`            |

## Troubleshooting

### Port already in use

If port 3000 is already in use, change it in the `.env` file:

```env
PORT=3001
```

### Database connection issues

1. Verify MySQL is running and accessible
2. Check credentials in `.env` are correct
3. Ensure firewall/security groups allow connections
4. For AWS RDS, verify security group and VPC settings

### Docker issues

```bash
# Clean Docker resources
docker-compose down -v
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
docker-compose up
```

### TypeORM synchronization issues

If you encounter database sync issues:

```bash
# Clear dist folder
rm -rf dist/

# Rebuild
npm run build

# Restart application
npm run start:dev
```

## Deployment

### AWS ECS/EKS Deployment

1. Build Docker image:

```bash
docker build -t pantry-registration-api .
```

2. Tag and push to ECR:

```bash
docker tag pantry-registration-api:latest <ecr-uri>:latest
docker push <ecr-uri>:latest
```

3. Update ECS task definition or Kubernetes deployment with new image

### Health Checks

The API provides health check endpoints for container orchestration:

- `GET /health` - Basic health check

## Contributing

1. Create a feature branch from main
2. Make your changes
3. Write/update tests
4. Ensure all tests pass
5. Run linting and fix any issues
6. Commit your changes
7. Push feature branch to remote
8. Create a Pull Request

### Commit Convention

Follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test changes
- `chore:` Build/config changes

## License

[MIT licensed](LICENSE)

## Support

For issues and questions:

- Create an issue in the repository
- Contact the development team
- Check existing documentation and issues first
