const CustomErrors = require('../errors');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { StatusCodes } = require('http-status-codes');
const { createRefreshAndAccessToken, verifyToken } = require('../utils/jwt');
const crypto = require('crypto');

const register = async (req, res) => {
  const { email, password, firstName, lastName, username } = req.body;

  if (!email || !password || !firstName || !lastName || !username)
    throw new CustomErrors.BadRequestError('Fill in all credential');

  if (await User.findOne({ email })) throw new CustomErrors.BadRequestError('This user already exist');

  await User.create({ email, password, username, profile: { firstName, lastName } });

  res.status(StatusCodes.CREATED).redirect('/login').json({ msg: 'Successfully created user' });
};

const login = async (req, res) => {
  const user = req.user;
  if (!user) throw new CustomErrors.BadRequestError('User does not exist');
  //TODO: If you're building your own authentication system, it's a really good idea to include a flag in your payloads, to indicate whether that token was generated by authenticating with user credentials, or by using a refresh token. You can use this flag to authorize sensitive operations, such as changing your password or making payments - so if the user didn't log in recently, you can prompt them to log in again for sensitive operations. I would say this is a must for most applications.
  const payload = { username: user.username, userId: user._id, role: user.role };

  const refreshTokenPayload = await RefreshToken.findOne({ userId: user._id });
  const refreshToken = crypto.randomBytes(40).toString('hex');

  if (!refreshTokenPayload) {
    await RefreshToken.create({
      userId: user._id,
      refreshToken: refreshToken,
    });
    return createRefreshAndAccessToken({ res, payload, refreshToken: refreshToken });
  }

  if (!refreshTokenPayload.isValid) throw new CustomErrors.BadRequestError('Invalid credentials');

  refreshTokenPayload.refreshToken = refreshToken;
  // refreshToken = refreshTokenPayload.refreshToken;
  await refreshTokenPayload.save();
  createRefreshAndAccessToken({ res, payload, refreshToken: refreshToken });
};

const refreshToken = async (req, res) => {
  const { refresh_token: refreshTokenCookies } = req.signedCookies;

  if (!refreshTokenCookies) throw new CustomErrors.BadRequestError('Token is invalid or may have expired');
  const decoded = verifyToken({ token: refreshTokenCookies, secret: process.env.REFRESH_TOKEN_SECRET });
  if (!decoded) throw new CustomErrors.BadRequestError('Invalid token');

  const refreshToken = await RefreshToken.findOne({
    refreshToken: decoded.refreshToken,
    userId: decoded.payload.userId,
  });

  if (!refreshToken || !refreshToken?.isValid) throw new CustomErrors.BadRequestError('Invalid refresh token');

  //TODO: can you remove the refreshToken keyword?
  createRefreshAndAccessToken({ res, payload: decoded.payload });
};

const logout = async (req, res) => {
  // const token = req.signedCookies.refresh_token;
  if (!req.user) throw new CustomErrors.BadRequestError('User is invalid. Log in and try again');
  const userId = req.user.userId;
  // if (token) {
  //   const decoded = verifyToken({ token, secret: process.env.REFRESH_TOKEN_SECRET });
  //   await RefreshToken.findOneAndDelete({ userId: decoded.payload.userId });
  // }
  await RefreshToken.findOneAndDelete({ userId });

  req.logOut((error) => {
    if (error) throw new CustomErrors.BadRequestError(`There was an error ${error}`);
  });

  res.cookie('access_token', '', { expires: new Date(Date.now()), httpOnly: true });
  res.cookie('refresh_token', '', { expires: new Date(Date.now()), httpOnly: true });
  res.status(StatusCodes.OK).json({ msg: 'Logout Successful', accessToken: null });
};

module.exports = { register, login, logout, refreshToken };
