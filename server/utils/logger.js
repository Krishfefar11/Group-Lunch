/**
 * logger.js — Structured JSON logging with pino
 *
 * In development: pretty-prints with colours via pino-pretty
 * In production:  emits newline-delimited JSON — pipe to any log aggregator
 *                 (Datadog, Loki, CloudWatch, etc.) without extra config
 *
 * Usage:
 *   const log = require('../utils/logger');
 *   log.info({ sessionId, userId }, 'User joined session');
 *   log.warn({ err }, 'Groq API slow');
 *   log.error({ err, sessionId }, 'Order placement failed');
 */

const pino = require('pino');

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),

  // Rename 'msg' → 'message' for readability in log aggregators
  messageKey: 'message',

  // Add service name to every log line
  base: { service: 'group-lunch-api' },

  // Serialise Error objects so stack traces appear in JSON
  serializers: {
    err: pino.stdSerializers.err,
  },

  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize:        true,
        translateTime:   'HH:MM:ss',
        ignore:          'pid,hostname,service',
        messageKey:      'message',
        levelFirst:      true,
      },
    },
  }),
});

module.exports = logger;
