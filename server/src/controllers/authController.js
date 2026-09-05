/**
 * Auth controller: register, login, current-user lookup.
 */
'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok, created, fail } = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { signToken } = require('../utils/token');
const userRepo = require('../repositories/userRepo');

const register = asyncHandler(async (req, res) => {
  const { name, email, password, college, branch, year, skills, interests } = req.body;

  const { user, error } = await userRepo.create({ name, email, password, college, branch, year, skills, interests });
  if (error === 'exists') {
    return fail(res, 409, 'An account with this email already exists', 'EMAIL_IN_USE');
  }

  const token = signToken(user);
  return created(res, { user: userRepo.toSafe(user), token }, 'Account created');
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await userRepo.findByEmailWithPassword(email);
  if (!user) throw ApiError.unauthorized('Incorrect email or password', 'INVALID_CREDENTIALS');

  const matches = await userRepo.comparePassword(user, password);
  if (!matches) throw ApiError.unauthorized('Incorrect email or password', 'INVALID_CREDENTIALS');

  const token = signToken(user);
  return ok(res, { user: userRepo.toSafe(user), token }, 'Logged in');
});

const me = asyncHandler(async (req, res) => {
  return ok(res, { user: userRepo.toSafe(req.user) });
});

module.exports = { register, login, me };
