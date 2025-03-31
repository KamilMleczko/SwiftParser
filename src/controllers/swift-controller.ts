import { Request, Response } from 'express';
import { DatabaseService } from '../services/database-service';

export class SwiftCodeController {
    private dbService: DatabaseService;

    constructor(dbService: DatabaseService) {
        this.dbService = dbService;
    }
    public async test(req: Request, res: Response): Promise<void> {
        try {
            res.status(200).json({ message: `Test endpoint successful {${req.params['test_string']}}` });
        } catch (error) {
            console.error('Test endpoint failed:', error);
            // res.status(500).json({ message: `Internal server error: ${error} ` }); // for debugging
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    public async getSwiftCode(req: Request, res: Response): Promise<void> {
        try {
            const swiftCode = req.params['swift_code'];
            console.log(`Fetching SWIFT code: ${swiftCode}`);
            const swiftCodeData = await this.dbService.getSwiftCodeByCode(swiftCode);
            console.log(`Fetched SWIFT code array: ${swiftCodeData?.address} `);
            if (!swiftCodeData ) {
                res.status(404).json({ message: `SWIFT code ${swiftCode} not found` });
                return;
            }

            if (swiftCodeData.isHeadquarter) {
                //For headquarter, we need to get the branches by their swift-code
                const branches = await this.dbService.getBranchesForHeadquarter(swiftCodeData.branches);
                res.json({
                    address: swiftCodeData.address,
                    bankName: swiftCodeData.name,
                    countryISO2: swiftCodeData.countryISO2,
                    countryName: swiftCodeData.countryName,
                    isHeadquarter: swiftCodeData.isHeadquarter,
                    swiftCode: swiftCodeData.swiftCode,
                    branches: branches ? branches.map(branch => ({
                        address: branch.address,
                        bankName: branch.name,
                        countryISO2: branch.countryISO2,
                        countryName: branch.countryName,
                        isHeadquarter: branch.isHeadquarter,
                        swiftCode: branch.swiftCode
                    })) : [] //to make sure it will at least return an empty array
                });
            } else {
                //For branches, we just return the data
                res.json({
                    address: swiftCodeData.address,
                    bankName: swiftCodeData.name,
                    countryISO2: swiftCodeData.countryISO2,
                    countryName: swiftCodeData.countryName,
                    isHeadquarter: swiftCodeData.isHeadquarter,
                    swiftCode: swiftCodeData.swiftCode
                });
            }
        } catch (error) {
            console.error('Error fetching SWIFT code:', error);
           // res.status(500).json({ message: `Internal server error: ${error} ` });
            res.status(500).json({ message: `Internal server error`});
        }
    }

    public async getSwiftCodesByCountry(req: Request, res: Response): Promise<void> {
        try{
            const countryISO2 = req.params['countryISO2'].toUpperCase();
            const swiftCodes = await this.dbService.getSwiftCodesByCountry(countryISO2);

            if (swiftCodes && swiftCodes.length > 0) {
                const country_name = swiftCodes[0].countryName;
                res.json({
                    countryISO2: countryISO2,
                    countryName: country_name,
                    swiftCodes: swiftCodes.map((SwiftCode) => {
                        return ({
                            address: SwiftCode.address,   
                            bankName: SwiftCode.name,
                            countryISO2: SwiftCode.countryISO2, 
                            isHeadquarter: SwiftCode.isHeadquarter,
                            swiftCode: SwiftCode.swiftCode
                        })
                    })
                });
            } else {
                res.status(404).json({ message: `SWIFT codes for country ${countryISO2} not found` });
            }
        } catch (error) {
            console.error('Error fetching SWIFT codes by country:', error);
            //res.status(500).json({ message: `Internal server error: ${error}` });
            res.status(500).json({ message: `Internal server error`});
        }
    }

    public async add_swift_code(req: Request, res: Response): Promise<void> {
        try {
            const { address, bankName, countryISO2, countryName, isHeadquarter, swiftCode } = req.body;
            
            //check if all fields are present
            if (!address || !bankName || !countryISO2 || !countryName || isHeadquarter === undefined || !swiftCode) {
                res.status(400).json({
                    message: 'Missing required fields. Please provide address, name, countryISO2, countryName, isHeadquarter, and swiftCode.'
                });
                return;
            }
            
            
            //cast isHeadquarter to boolean
            const isHQ = Boolean(isHeadquarter);
            
            //If isHeadquarter is true, ensure the SWIFT code ends with 'XXX'
            if (isHQ && !swiftCode.trim().toUpperCase().endsWith('XXX')) {
                res.status(400).json({
                    message: 'Headquarters SWIFT codes must end with XXX.'
                });
                return;
            }
            
            const result = await this.dbService.addSwiftCode({
                address,
                name: bankName, 
                countryISO2,
                countryName,
                isHeadquarter: isHQ,
                swiftCode
            });
            
            if (result.success) {
                res.status(201).json({ message: result.message });
            } else {
                res.status(409).json({ message: result.message });
            }
        } catch (error) {
            console.error('Failed to add SWIFT code:', error);
            //res.status(500).json({ message: `Internal server error: ${error}` }); //for debugging
            res.status(500).json({ message: `Internal server error`});
        }
    }


    public async delete_swift_code(req: Request, res: Response): Promise<void> {
        try {
            const swiftCode = req.params['swift_code'].toUpperCase();
            
            if (!swiftCode) {
                res.status(400).json({ message: 'SWIFT code is required' });
                return;
            }
            
            const result = await this.dbService.deleteSwiftCode(swiftCode);
            
            if (result.success) {
                res.status(200).json({ message: result.message });
            } else {
                res.status(404).json({ message: result.message });
            }
        } catch (error) {
            console.error('Failed to delete SWIFT code:', error);
            //res.status(500).json({ message: `Internal server error: ${error}` }); //for debugging
            res.status(500).json({ message: 'Internal server error' });
        }

    }
    
}