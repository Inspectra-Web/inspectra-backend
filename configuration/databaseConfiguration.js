import { connect } from 'mongoose';
import { envConfig } from './environmentConfig.js';

const dbUrl = envConfig.DATABASE_URL.replace('<db_password>', envConfig.DATABASE_PASSWORD);

export const dbConfig = async () => {
  try {
    const response = await connect(dbUrl);
    console.log(`Successfully connected to ${response.connection.host}`);
  } catch (error) {
    console.error(error.message);
  }
};
