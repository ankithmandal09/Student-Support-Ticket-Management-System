import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { databaseOptions } from './config.js';
export default new DataSource(databaseOptions());
