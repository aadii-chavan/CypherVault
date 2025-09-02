# CypherVault - Secure Password Manager
[CYPHER VAULT APP](https://cypher-vault-project.web.app/) <br>
A zero-knowledge, end-to-end encrypted password manager built with React, TypeScript, and Firebase.

## Security Features

### Core Security

- **Zero-Knowledge Architecture**: All encryption/decryption happens client-side; your encryption key (derived from your account password) and passwords never leave your device.
- **Advanced Encryption**: AES-256-GCM encryption with the Web Crypto API for authenticated encryption.
- **Strong Key Derivation**: PBKDF2-HMAC-SHA256 with 310,000 iterations (OWASP recommended).
- **Per-Entry Encryption**: Each password entry is encrypted individually with a unique salt and IV.
- **Secure Storage**: All sensitive data is stored encrypted in Firebase.

### Enhanced Security (Tier 2)

- **Content Security Policy (CSP)**: Strong CSP headers block inline scripts and restrict content to trusted sources.
- **Two-Factor Authentication (2FA)**: TOTP-based authentication using authenticator apps like Google Authenticator.
- **Automatic Vault Locking**: Configurable auto-lock timer to protect your vault during inactivity.
- **Reauthentication for Sensitive Actions**: Actions like changing your account password or deleting your account require password verification.
- **Memory Sanitization**: Sensitive data is securely wiped from memory when no longer needed.
- **Password Strength Meter**: Real-time password strength feedback using zxcvbn for entropy analysis.
- **Security Audit Logs**: Comprehensive logging of security events with searchable history.

### Elite Security (Tier 3)

- **WebAuthn/FIDO2 Integration**: Hardware-backed, phishing-resistant authentication with security keys and biometrics.
- **Clipboard Auto-Clear**: Automatically clears sensitive data from clipboard after configurable timeout.
- **Stealth Mode & Panic Key**: Quickly hide sensitive information and lock vault with a panic keystroke combination.
- **Session Integrity Verification**: Cryptographic verification of session integrity to protect against tampering.
- **Browser Fingerprinting**: Limit vault access to trusted devices only with sophisticated device recognition.
- **Decoy Vault**: Protection against coercion attacks with believable fake credentials.
- **Password Breach Checking**: Zero-knowledge password breach verification against Have I Been Pwned database.

## Features

- Secure password storage with end-to-end encryption
- Vault key derived from your account password (no separate master key)
- Auto-lock functionality
- User authentication
- Password generation
- Secure sharing
- Two-Factor Authentication
- Security audit logs
- Hardware security key support
- Advanced anti-tampering protections
- Comprehensive Security Center

## Recent Changes

- Vault unlock now uses your account password; the separate master key has been removed.
- Signup no longer asks for a master key.
- Settings no longer include "Change Masterkey"; use "Change Password" to rotate credentials. Your vault remains encrypted with a key derived from your new password on next unlock/save flows.
- Login screen layout updated; "Forgot password?" appears under the Sign In button.
- .gitignore updated to exclude common build outputs, caches, emulator logs, and OS files.

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase account

## Environment Setup

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your Firebase configuration:
   - Go to your Firebase Console
   - Select your project
   - Go to Project Settings
   - Copy the configuration values to your `.env` file

## Installation

1. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

2. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## Deployment

1. Build the application:
   ```bash
   npm run build
   # or
   yarn build
   ```

2. Deploy to Firebase Hosting:
   ```bash
   npm run deploy
   # or
   yarn deploy
   ```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
