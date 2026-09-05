/**
 * Barrel export for all Mongoose models.
 */
'use strict';

module.exports = {
  User: require('./User'),
  ProjectIdea: require('./ProjectIdea'),
  Conversation: require('./Conversation'),
  Feedback: require('./Feedback'),
};
