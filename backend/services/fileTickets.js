const jwt = require('jsonwebtoken');

const FILE_TICKET_AUDIENCE = 'lms-file-content';
const DEFAULT_ISSUER = 'lms-api';
const DEFAULT_TTL = '30m';
const PACKAGE_COOKIE_NAME = 'lms_package_ticket';

class FileTicketError extends Error {
  constructor(message = 'File access ticket is invalid or expired') {
    super(message);
    this.name = 'FileTicketError';
    this.code = 'FILE_TICKET_INVALID';
    this.statusCode = 401;
  }
}

function ticketIssuer() {
  return `${process.env.JWT_ISSUER || DEFAULT_ISSUER}:files`;
}

function requireSecret() {
  if (!process.env.JWT_SECRET) {
    const error = new Error('File access is unavailable');
    error.code = 'FILE_ACCESS_UNAVAILABLE';
    error.statusCode = 503;
    throw error;
  }
  return process.env.JWT_SECRET;
}

function issueFileTicket({ kind, resourceId, userId }) {
  return jwt.sign(
    { kind, resourceId: Number(resourceId) },
    requireSecret(),
    {
      algorithm: 'HS256',
      audience: FILE_TICKET_AUDIENCE,
      issuer: ticketIssuer(),
      subject: String(userId),
      expiresIn: process.env.FILE_TICKET_TTL || DEFAULT_TTL,
    },
  );
}

function verifyFileTicket(token, { kind, resourceId }) {
  try {
    const payload = jwt.verify(token, requireSecret(), {
      algorithms: ['HS256'],
      audience: FILE_TICKET_AUDIENCE,
      issuer: ticketIssuer(),
    });
    if (!payload || typeof payload !== 'object'
        || payload.kind !== kind
        || Number(payload.resourceId) !== Number(resourceId)
        || !Number.isInteger(Number(payload.sub))) {
      throw new FileTicketError();
    }
    return { userId: Number(payload.sub) };
  } catch (error) {
    if (error?.statusCode === 503) throw error;
    if (error instanceof FileTicketError) throw error;
    throw new FileTicketError();
  }
}

module.exports = {
  FILE_TICKET_AUDIENCE,
  FileTicketError,
  PACKAGE_COOKIE_NAME,
  issueFileTicket,
  verifyFileTicket,
};
