#!/usr/bin/env node

/**
 * CLI tool for managing case manager accounts in Cognito.
 *
 * Required env vars:
 *   AWS_REGION             – e.g. us-east-1
 *   COGNITO_USER_POOL_ID   – e.g. us-east-1_AbCdEfGhI
 *
 * AWS credentials are resolved via the standard SDK chain
 * (env vars, ~/.aws/credentials, IAM role, etc.).
 *
 * Required IAM permissions on the User Pool:
 *   cognito-idp:AdminCreateUser
 *   cognito-idp:AdminAddUserToGroup
 *   cognito-idp:ListUsersInGroup
 *   cognito-idp:AdminDisableUser
 *   cognito-idp:AdminEnableUser
 *
 * Usage:
 *   node scripts/case-manager-cli.js create --email user@example.com --name "Jane Doe"
 *   node scripts/case-manager-cli.js list
 *   node scripts/case-manager-cli.js disable --email user@example.com
 *   node scripts/case-manager-cli.js enable  --email user@example.com
 */

const {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
  ListUsersInGroupCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
} = require('@aws-sdk/client-cognito-identity-provider');

const GROUP_NAME = 'case_managers';

function getConfig() {
  const region = process.env.AWS_REGION;
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  if (!region || !userPoolId) {
    console.error('Error: AWS_REGION and COGNITO_USER_POOL_ID env vars are required.');
    process.exit(1);
  }
  return { region, userPoolId };
}

function parseArgs(args) {
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--') && i + 1 < args.length) {
      flags[args[i].slice(2)] = args[i + 1];
      i++;
    }
  }
  return flags;
}

async function createCaseManager(client, userPoolId, email, name) {
  const nameParts = (name || '').split(' ');
  const firstName = nameParts[0] || email.split('@')[0];
  const lastName = nameParts.slice(1).join(' ') || '';

  const userAttributes = [
    { Name: 'email', Value: email },
    { Name: 'email_verified', Value: 'true' },
  ];
  if (firstName) userAttributes.push({ Name: 'given_name', Value: firstName });
  if (lastName) userAttributes.push({ Name: 'family_name', Value: lastName });

  console.log(`Creating user: ${email} ...`);
  const createResult = await client.send(
    new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      UserAttributes: userAttributes,
      DesiredDeliveryMediums: ['EMAIL'],
    }),
  );

  const username = createResult.User?.Username;
  console.log(`User created: ${username} (status: ${createResult.User?.UserStatus})`);

  console.log(`Adding to group: ${GROUP_NAME} ...`);
  await client.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: username,
      GroupName: GROUP_NAME,
    }),
  );

  console.log(`Done. ${email} is now a case manager.`);
  console.log('The user will receive an email with a temporary password.');
}

async function listCaseManagers(client, userPoolId) {
  let nextToken;
  const users = [];

  do {
    const result = await client.send(
      new ListUsersInGroupCommand({
        UserPoolId: userPoolId,
        GroupName: GROUP_NAME,
        Limit: 60,
        NextToken: nextToken,
      }),
    );
    if (result.Users) users.push(...result.Users);
    nextToken = result.NextToken;
  } while (nextToken);

  if (users.length === 0) {
    console.log('No case managers found.');
    return;
  }

  console.log(`\nCase Managers (${users.length}):\n`);
  console.log('Username'.padEnd(40) + 'Email'.padEnd(35) + 'Status'.padEnd(20) + 'Enabled');
  console.log('-'.repeat(105));

  for (const u of users) {
    const emailAttr = (u.Attributes || []).find((a) => a.Name === 'email');
    const email = emailAttr?.Value || 'N/A';
    console.log(
      (u.Username || '').padEnd(40) +
        email.padEnd(35) +
        (u.UserStatus || '').padEnd(20) +
        (u.Enabled ? 'Yes' : 'No'),
    );
  }
}

async function disableCaseManager(client, userPoolId, email) {
  console.log(`Disabling user: ${email} ...`);
  await client.send(
    new AdminDisableUserCommand({
      UserPoolId: userPoolId,
      Username: email,
    }),
  );
  console.log(`Done. ${email} has been disabled.`);
}

async function enableCaseManager(client, userPoolId, email) {
  console.log(`Enabling user: ${email} ...`);
  await client.send(
    new AdminEnableUserCommand({
      UserPoolId: userPoolId,
      Username: email,
    }),
  );
  console.log(`Done. ${email} has been re-enabled.`);
}

function printUsage() {
  console.log(`
Case Manager CLI – Manage Cognito case manager accounts

Usage:
  node scripts/case-manager-cli.js <command> [options]

Commands:
  create   --email <email> --name <name>   Create a case manager account
  list                                      List all case managers
  disable  --email <email>                  Disable a case manager account
  enable   --email <email>                  Re-enable a case manager account

Environment variables (required):
  AWS_REGION              AWS region (e.g. us-east-1)
  COGNITO_USER_POOL_ID    Cognito User Pool ID
  `);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    printUsage();
    process.exit(0);
  }

  const { region, userPoolId } = getConfig();
  const client = new CognitoIdentityProviderClient({ region });
  const flags = parseArgs(args.slice(1));

  try {
    switch (command) {
      case 'create': {
        if (!flags.email) {
          console.error('Error: --email is required for create');
          process.exit(1);
        }
        await createCaseManager(client, userPoolId, flags.email, flags.name);
        break;
      }
      case 'list': {
        await listCaseManagers(client, userPoolId);
        break;
      }
      case 'disable': {
        if (!flags.email) {
          console.error('Error: --email is required for disable');
          process.exit(1);
        }
        await disableCaseManager(client, userPoolId, flags.email);
        break;
      }
      case 'enable': {
        if (!flags.email) {
          console.error('Error: --email is required for enable');
          process.exit(1);
        }
        await enableCaseManager(client, userPoolId, flags.email);
        break;
      }
      default:
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }
  } catch (err) {
    console.error(`\nError: ${err.message || err}`);
    if (err.name) console.error(`  (${err.name})`);
    process.exit(1);
  }
}

main();
