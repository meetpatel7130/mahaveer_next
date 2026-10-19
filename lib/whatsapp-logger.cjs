'use strict';

const write = (level, message) => console[level](message);

module.exports = {
  info: (message) => write('info', message),
  warn: (message) => write('warn', message),
  error: (message) => write('error', message),
};
