import { SwiftCode } from '../types/swift-types';
import { MongoClient, Collection, Db } from 'mongodb';
import { readFileSync } from 'fs';
import xlsx from 'xlsx';

export class DatabaseService {
    private client: MongoClient | null = null;
    private db: Db | null = null;
    private readonly mongoUri: string;
    private readonly dbName: string;
    private readonly filePath: string;


    constructor(mongoUri?: string, dbName?: string, filePath?: string) {
        this.mongoUri = mongoUri || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
        this.dbName = dbName || process.env.DB_NAME || 'swift_codes_db';
        this.filePath = filePath || process.env.FILE_PATH || "data//Interns_2025_SWIFT_CODES.xlsx";
    }

    public async connect(): Promise<void> {
        try {
            this.client = new MongoClient(this.mongoUri);
            await this.client.connect();
            console.log('Connected to MongoDB');
            
            this.db = this.client.db(this.dbName);
        } catch (error) {
            console.error('Failed to connect to MongoDB:', error);
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
            console.log('MongoDB connection closed');
        }
    }

    public parseFile(): SwiftCode[]{
        const fileBuffer = readFileSync(this.filePath);
        const workbook = xlsx.read(fileBuffer, {type: "buffer"});
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet);

        const swiftCodes: SwiftCode[] = [];
        const unassignedBranches: string[] = [];
        const headquartersMap = new Map<string, SwiftCode>();
        
        rows.forEach((row: any) => {
            console.log("Row Data:", row);
        });
        rows.forEach((row: any) => {
            const countryISO2 = row['COUNTRY ISO2 CODE']?.trim().toUpperCase() || "UNKNOWN";
            const swiftCode = row['SWIFT CODE']?.trim() || "UNKNOWN";
            //redundant may be omitted
            const codeType = row['CODE TYPE']?.trim() || "UNKNOWN";
            const name = row['NAME']?.trim() || "UNKNOWN";
            const address = row['ADDRESS']?.trim() || "UNKNOWN";
            //redundant may be omitted
            const townName = row['TOWN NAME']?.trim() || "UNKNOWN";
            const countryName = row['COUNTRY NAME']?.trim().toUpperCase() || "UNKNOWN";
            //redundant may be omitted
            const timeZone = row['TIME ZONE']?.trim() || "UNKNOWN";

            const isHeadquarter = swiftCode.endsWith('XXX');
    

            const swiftEntry: SwiftCode = {
                countryISO2,
                swiftCode,
                codeType,
                name,
                address,
                townName,
                countryName,
                timeZone,
                isHeadquarter,
                branches: []
            };

            swiftCodes.push(swiftEntry);

            if (isHeadquarter) {
                headquartersMap.set(swiftCode.slice(0, 8), swiftEntry);
            } 
            else{
                unassignedBranches.push(swiftCode);
            }
            
        });

        //second pass: assign branches to headquarters (needed if branches appear before headquarters in parsed file)
        unassignedBranches.forEach(branch_code => {
            const hqSwiftCode = branch_code.slice(0, 8);
            const headquarters = headquartersMap.get(hqSwiftCode);
            if (headquarters) {
                headquarters.branches.push(branch_code);
            }
        });

        return swiftCodes;
    }

    public async initializeDatabase(): Promise<void> {
        if (!this.db) {
            throw new Error('Database connection not established');
        }

        try {
            //if collection doesn't exist create it
            const collections = await this.db.listCollections().toArray();
            const collectionNames = collections.map(c => c.name);
            
            if (!collectionNames.includes('swift_codes')) {
                await this.db.createCollection('swift_codes');
                // Create indexes for efficient querying
                const swiftCodesCollection = this.db.collection('swift_codes');
                await swiftCodesCollection.createIndex({ swiftCode: 1 }, { unique: true });
                await swiftCodesCollection.createIndex({ countryISO2: 1 });
                await swiftCodesCollection.createIndex({ 'branches': 1 });
            }
        } catch (error) {
            console.error('Failed to initialize database:', error);
            throw error;
        }
    }

    public async insertSwiftCodes(swiftCodes: SwiftCode[]): Promise<void> {
        if (!this.db) {
            throw new Error('Database connection not established');
        }
        try {
            const swiftCodesCollection = this.db.collection('swift_codes');
            
            //Clear existing data (optional, may be removed if unnecessary)
            await swiftCodesCollection.deleteMany({});
            console.log('Cleared existing SWIFT codes');
            
            if (swiftCodes.length > 0) {
                await swiftCodesCollection.insertMany(swiftCodes);
                console.log(`Inserted ${swiftCodes.length} SWIFT codes into database`);
            } else {
                console.log('No SWIFT codes to insert');
            }
        } catch (error) {
            console.error('Failed to insert SWIFT codes:', error);
            throw error;
        }
    }

    public async setupDatabase(): Promise<void> {
        try {
            console.log('Parsing SWIFT codes file...');
            const swiftCodes = this.parseFile();
            console.log(`Parsed ${swiftCodes.length} SWIFT codes`);
            
            if (!this.client || !this.db) {
                await this.connect();
            }
            
            await this.initializeDatabase();
            await this.insertSwiftCodes(swiftCodes);
            
            console.log('Database setup complete');
        } catch (error) {
            console.error('Database setup failed:', error);
            throw error;
        }
    }

    public async getSwiftCodeByCode(swiftCode: string): Promise<SwiftCode | null> {
        try{
            if (!this.db) {
                throw new Error('Database connection not established');
            }
            const swiftCodesCollection = this.db.collection('swift_codes');
            return await swiftCodesCollection.findOne({ swiftCode }) as SwiftCode | null;
        }catch (error) {
                console.error('Unable to get SWIFT details by code', error);
                throw error;
            }
    }

    public async getBranchesForHeadquarter(branchesSwiftCodes: string[]): Promise<SwiftCode[]|null> {
        if (!this.db) {
            throw new Error('Database connection not established');
        }
        try{
            if (branchesSwiftCodes.length === 0) {
                console.log('empty branches list provided');
                return null;    
            }
            const swiftCodesCollection = this.db.collection('swift_codes');
            return await swiftCodesCollection.find({ swiftCode: { $in: branchesSwiftCodes } })
            .map(({ _id, ...doc}) => doc)
            .toArray() as SwiftCode[] | null;
        } 
        catch (error) {
            console.error(`Unable to retrieve branches for headquarter, branch list: ${branchesSwiftCodes}, \n ${error} `);
            throw error;
        }
    }

    public async getSwiftCodesByCountry(countryISO2: string): Promise<SwiftCode[] | null> {
        if (!this.db) {
            throw new Error('Database connection not established');
        }
        try{
            const swiftCodesCollection = this.db.collection('swift_codes');
            return await swiftCodesCollection.find({ countryISO2 })
            .map(({ _id, ...doc}) => doc)
            .toArray() as SwiftCode[] | null;
        } catch (error) {
            console.error('Unable to get SWIFT codes by country', error);
            throw error;
        }
    }

    public async addSwiftCode(swiftCodeData: {
        address: string;
        name: string;
        countryISO2: string;
        countryName: string;
        isHeadquarter: boolean;
        swiftCode: string;
    }): Promise<{ success: boolean; message: string }> {
        if (!this.db) {
            throw new Error('Database connection not established');
        }

        try {
            const swiftCodesCollection = this.db.collection('swift_codes');
            
            // Check if SWIFT code already exists
            const existingCode = await swiftCodesCollection.findOne({ swiftCode: swiftCodeData.swiftCode });
            if (existingCode ) {
                return { 
                    success: false, 
                    message: `SWIFT code ${swiftCodeData.swiftCode} already exists in the database` 
                };
            }
              
            const newSwiftCode: SwiftCode = {
                countryISO2: swiftCodeData.countryISO2.trim().toUpperCase(),
                swiftCode: swiftCodeData.swiftCode.trim().toUpperCase(),
                name: swiftCodeData.name.trim(),
                address: swiftCodeData.address.trim(),
                countryName: swiftCodeData.countryName.trim().toUpperCase(),
                isHeadquarter: swiftCodeData.isHeadquarter,
                branches: [],
                //Set UNKNOWN redundant fields
                codeType: "UNKNOWN",
                townName: "UNKNOWN",
                timeZone: "UNKNOWN"
            };
            
            //if it's a branch we have to check if it has a headquarters
            if (!newSwiftCode.isHeadquarter) {
                const branchPrefix = newSwiftCode.swiftCode.slice(0, 8);
                const headquarters = await swiftCodesCollection.findOne({
                    isHeadquarter: true,  //ensure it's a headquarters
                    swiftCode: { $regex: `^${branchPrefix}` }  //match the prefix                                  
                });
                
                if (headquarters) { //if any headquarters were found it means there will be future conflict when adding new branches
                    await swiftCodesCollection.updateOne(
                        { swiftCode: headquarters.swiftCode },
                        { $addToSet: { branches: newSwiftCode.swiftCode } }
                    );
                    console.log(`Added branch ${newSwiftCode.swiftCode} to headquarters ${headquarters.swiftCode}`);
                }
                else {
                    console.log(`No headquarters found for branch ${newSwiftCode.swiftCode}`);
                }
                
            }
            //if it's a headquarter we have to check if it has any preexisting branches
            else if (newSwiftCode.isHeadquarter) {
                const headquaterPrefix = newSwiftCode.swiftCode.slice(0, 8);
                const macthingHeadquarters = await swiftCodesCollection.findOne({
                    isHeadquarter: true,  //ensure it's a headquarters
                    swiftCode: { $regex: `^${headquaterPrefix}` }  //match the prefix                                  
                });
                
                if (macthingHeadquarters) {
                    return { 
                        success: false, 
                        message: `SWIFT code ${swiftCodeData.swiftCode} that is headquarter already macthes existing headquarters prefix ${macthingHeadquarters.swiftCode}` 
                    };
                }
                else{ //push all preexisting branches to their new headquarter
                    const macthingBranches = await swiftCodesCollection.find({
                        isHeadquarter: false,  //ensure it's a branch
                        swiftCode: { $regex: `^${headquaterPrefix}` }  //match the prefix                                  
                    }).toArray();

                    macthingBranches.forEach(branch => {
                        newSwiftCode.branches.push(branch.swiftCode);
                    })
                }
            }
            
            await swiftCodesCollection.insertOne(newSwiftCode);
            return { 
                success: true, 
                message: `Successfully added SWIFT code ${newSwiftCode.swiftCode}` 
            };
        } catch (error) {
            console.error('Failed to add SWIFT code:', error);
            throw error;
        }
    }


    public async deleteSwiftCode(swiftCode: string): Promise<{ success: boolean; message: string }> {
        if (!this.db) {
            throw new Error('Database connection not established');
        }

        try {
            const swiftCodesCollection = this.db.collection('swift_codes');
            
            const codeToDelete = await swiftCodesCollection.findOne({ swiftCode });
            if (!codeToDelete) {
                return {
                    success: false,
                    message: `SWIFT code ${swiftCode} not found in the database`
                };
            }
            
            //If this is a headquarters code, we won't delete the branches, it wasn't explicitly stated in the requirements
            
            //If this is a branch code, also remove it from its headquarters' branches array
            if (!codeToDelete.isHeadquarter) {
                const branchPrefix = swiftCode.slice(0, 8);
                
                // Find the headquarters by matching both the prefix and isHeadquarter flag
                const headquaters = await swiftCodesCollection.findOne(
                    { 
                        swiftCode: { $regex: `^${branchPrefix}` },
                        isHeadquarter: true
                    },
                );
                
                if (headquaters && Array.isArray(headquaters.branches)) {
                    // Remove the branch manually
                    const updatedBranches = headquaters.branches.filter(branch => branch !== swiftCode);
            
                    // Update the headquarters document with the new branches array
                    await swiftCodesCollection.updateOne(
                        { swiftCode: headquaters.swiftCode },
                        { $set: { branches: updatedBranches } }
                    );
                }
                
            }
            
            const result = await swiftCodesCollection.deleteOne({ swiftCode });
            
            if (result.deletedCount === 1) {
                return {
                    success: true,
                    message: `Successfully deleted SWIFT code ${swiftCode}`
                };
            } else {
                return {
                    success: false,
                    message: `Failed to delete SWIFT code ${swiftCode}`
                };
            }
        } catch (error) {
            console.error('Failed to delete SWIFT code:', error);
            throw error;
        }
    }



}

export const createDatabaseService = async (mongoUri?: string, dbName?: string, filePath?: string): Promise<DatabaseService> => {
    const dbService = new DatabaseService(mongoUri, dbName, filePath);
    await dbService.connect();
    return dbService;
};