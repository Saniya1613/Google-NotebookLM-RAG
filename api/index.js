/**
 * Vercel Serverless Function Entry Point
 * 
 * Exports the Express app as a serverless function for Vercel deployment.
 * Vercel invokes this for every incoming request.
 */

import "dotenv/config";
import app from "../src/app.js";

export default app;
