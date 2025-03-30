import { DatabaseService } from '../services/database-service';

const SWIFT_CODES_FILE_PATH = process.env.SWIFT_CODES_FILE_PATH || "data//Interns_2025_SWIFT_CODES.xlsx";
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'swift_codes_db';

async function main() {
    const dbService = new DatabaseService(MONGO_URI, DB_NAME, SWIFT_CODES_FILE_PATH);
    
    try {
        await dbService.connect();
        console.log(`Initializing database with SWIFT codes from: ${SWIFT_CODES_FILE_PATH}`);
        await dbService.setupDatabase();
        console.log('Database initialization completed successfully');
    } catch (error) {
        console.error('Database initialization failed:', error);
        process.exit(1);
    } finally {
        await dbService.disconnect();
    }
}

main();