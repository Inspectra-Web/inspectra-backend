import { envConfig } from '../configuration/environmentConfig.js';
import AppError from '../utils/appError.js';

const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}:${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
  const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
  const message = `${value} already exists as an account.`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () => new AppError('Invalid Token... Please login again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired... Please login again!', 401);

const handleMulterError = err => new AppError(`Image upload capacity is maximum of 10`, 400);

const sendErrorDev = (err, req, res) => {
  return res
    .status(err.statusCode)
    .json({ status: err.status, error: err, message: err.message, stack: err.stack });
};

const sendErrorProd = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      return res.status(err.statusCode).json({ status: err.status, message: err.message });
    }
    console.log(err);
    return res.status(500).json({ status: 'error', message: 'Something went wrong!' });
  }
};

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (envConfig.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.name = err.name;
    error.message = err.message;
    error.stack = err.stack;
    error.errmsg = err.errmsg;

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    if (error.name === 'MulterError' && 'LIMIT_UNEXPECTED_FILE') error = handleMulterError(error);

    sendErrorProd(error, req, res);
  }
};

export default globalErrorHandler;
