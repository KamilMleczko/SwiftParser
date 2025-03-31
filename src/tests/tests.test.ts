
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import { MongoClient, Db } from 'mongodb';
import { DatabaseService } from '../services/database-service';
import { SwiftRoutes } from '../routes/swift-routes';
import { SwiftCode } from '../types/swift-types';

describe('SWIFT Code API Endpoints', () => {
  let app: express.Express;
  let dbService: DatabaseService;
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let db: Db;

  
  const testSwiftCodes: Partial<SwiftCode>[] = [
    {
      countryISO2: 'US',
      swiftCode: 'CHASUS33XXX',
      name: 'JPMorgan Chase Bank',
      address: '383 Madison Ave, New York, NY 10017',
      countryName: 'UNITED STATES',
      isHeadquarter: true,
      branches: ['CHASUS33BRN', 'CHASUS33SFC']
    },
    {
      countryISO2: 'US',
      swiftCode: 'CHASUS33BRN',
      name: 'JPMorgan Chase Bank - Boston Branch',
      address: '50 Rowes Wharf, Boston, MA 02110',
      countryName: 'UNITED STATES',
      isHeadquarter: false,
      branches: []
    },
    {
      countryISO2: 'US',
      swiftCode: 'CHASUS33SFC',
      name: 'JPMorgan Chase Bank - San Francisco Branch',
      address: '560 Mission St, San Francisco, CA 94105',
      countryName: 'UNITED STATES',
      isHeadquarter: false,
      branches: []
    },
    {
      countryISO2: 'DE',
      swiftCode: 'DEUTDEFFXXX',
      name: 'Deutsche Bank AG',
      address: 'Taunusanlage 12, 60325 Frankfurt am Main',
      countryName: 'GERMANY',
      isHeadquarter: true,
      branches: ['DEUTDEFFBER']
    },
    {
      countryISO2: 'DE',
      swiftCode: 'DEUTDEFFBER',
      name: 'Deutsche Bank AG - Berlin Branch',
      address: 'Otto-Suhr-Allee 6-16, 10585 Berlin',
      countryName: 'GERMANY',
      isHeadquarter: false,
      branches: []
    }
  ];

  beforeAll(async () => {
    //Set up MongoDB Memory Server for testing
    mongoServer = new MongoMemoryServer();
    await mongoServer.start();
    const mongoUri = await mongoServer.getUri();
    dbService = new DatabaseService(mongoUri, 'swift_codes_test_db');
    await dbService.connect();
    
    //Save reference to MongoDB client and database for direct operations
    mongoClient = (dbService as any).client;
    db = (dbService as any).db;
    
    await dbService.initializeDatabase();
    const swiftCodesCollection = db.collection('swift_codes');
    await swiftCodesCollection.insertMany(testSwiftCodes);
    
    //et up Express app with routes
    app = express();
    app.use(express.json());
    
    const swiftRoutes = new SwiftRoutes(dbService);
    app.use('/v1/swift-codes', swiftRoutes.getRouter());
  });

  afterAll(async () => {
    await mongoClient?.close();
    await mongoServer?.stop();
  });

  // // //  Endpoint 1: GET /v1/swift-codes/{swift-code} // // // 
  describe('GET /v1/swift-codes/{swift-code}', () => {
    it('should return headquarters data with branches when requesting a headquarters SWIFT code', async () => {
      const response = await request(app)
        .get('/v1/swift-codes/CHASUS33XXX')
        .expect(200);

      expect(response.body).toHaveProperty('swiftCode', 'CHASUS33XXX');
      expect(response.body).toHaveProperty('bankName', 'JPMorgan Chase Bank');
      expect(response.body).toHaveProperty('isHeadquarter', true);
      expect(response.body).toHaveProperty('branches');
      expect(response.body.branches).toHaveLength(2);
      
      // Check branch data is formatted correctly
      expect(response.body.branches[0]).toHaveProperty('swiftCode');
      expect(response.body.branches[0]).toHaveProperty('bankName');
      expect(response.body.branches[0]).toHaveProperty('address');
      expect(response.body.branches[0]).toHaveProperty('countryISO2');
      expect(response.body.branches[0]).toHaveProperty('isHeadquarter', false);
    });

    it('should return branch data without branches array when requesting a branch SWIFT code', async () => {
      const response = await request(app)
        .get('/v1/swift-codes/CHASUS33BRN')
        .expect(200);

      expect(response.body).toHaveProperty('swiftCode', 'CHASUS33BRN');
      expect(response.body).toHaveProperty('bankName', 'JPMorgan Chase Bank - Boston Branch');
      expect(response.body).toHaveProperty('isHeadquarter', false);
      expect(response.body).not.toHaveProperty('branches');
    });

    it('should return 404 when requesting a non-existent SWIFT code', async () => {
      const response = await request(app)
        .get('/v1/swift-codes/NONEXISTENT')
        .expect(404);

      expect(response.body).toHaveProperty('message', 'SWIFT code NONEXISTENT not found');
    });
  });

  // // //  Endpoint 2: GET /v1/swift-codes/country/{countryISO2} // // // 
  describe('GET /v1/swift-codes/country/{countryISO2}', () => {
    it('should return all SWIFT codes for a specific country', async () => {
      const response = await request(app)
        .get('/v1/swift-codes/country/US')
        .expect(200);

      expect(response.body).toHaveProperty('countryISO2', 'US');
      expect(response.body).toHaveProperty('countryName', 'UNITED STATES');
      expect(response.body).toHaveProperty('swiftCodes');
      expect(response.body.swiftCodes).toHaveLength(3);
      
      // Check SWIFT code data format
      expect(response.body.swiftCodes[0]).toHaveProperty('swiftCode');
      expect(response.body.swiftCodes[0]).toHaveProperty('bankName');
      expect(response.body.swiftCodes[0]).toHaveProperty('address');
      expect(response.body.swiftCodes[0]).toHaveProperty('countryISO2', 'US');
    });

    it('should return 404 when requesting SWIFT codes for a non-existent country', async () => {
      const response = await request(app)
        .get('/v1/swift-codes/country/XX')
        .expect(404);

      expect(response.body).toHaveProperty('message', 'SWIFT codes for country XX not found');
    });

    it('should handle case insensitivity for country codes', async () => {
      const response = await request(app)
        .get('/v1/swift-codes/country/de')
        .expect(200);

      expect(response.body).toHaveProperty('countryISO2', 'DE');
      expect(response.body).toHaveProperty('countryName', 'GERMANY');
      expect(response.body.swiftCodes).toHaveLength(2);
    });
  });

  // // // Endpoint 3: POST /v1/swift-codes // // // 
  describe('POST /v1/swift-codes', () => {
    it('should successfully add a new headquarters SWIFT code', async () => {
      const newHQ = {
        address: '25 Bank Street, Canary Wharf, London E14 5JP',
        bankName: 'HSBC Bank plc',
        countryISO2: 'GB',
        countryName: 'United Kingdom',
        isHeadquarter: true,
        swiftCode: 'MIDLGB22XXX'
      };

      const response = await request(app)
        .post('/v1/swift-codes')
        .send(newHQ)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Successfully added SWIFT code MIDLGB22XXX');
      
      //Verify the code was added
      const verifyResponse = await request(app)
        .get('/v1/swift-codes/MIDLGB22XXX')
        .expect(200);
        
      expect(verifyResponse.body).toHaveProperty('swiftCode', 'MIDLGB22XXX');
    });

    it('should successfully add a new branch SWIFT code and link it to its headquarters', async () => {
      const newBranch = {
        address: 'City Point, 1 Ropemaker Street, London EC2Y 9AW',
        bankName: 'HSBC Bank plc - London City Branch',
        countryISO2: 'GB',
        countryName: 'United Kingdom',
        isHeadquarter: false,
        swiftCode: 'MIDLGB22LCB'
      };

      const response = await request(app)
        .post('/v1/swift-codes')
        .send(newBranch)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Successfully added SWIFT code MIDLGB22LCB');
      
      //Verify the branch was added
      const branchResponse = await request(app)
        .get('/v1/swift-codes/MIDLGB22LCB')
        .expect(200);
        
      expect(branchResponse.body).toHaveProperty('swiftCode', 'MIDLGB22LCB');
      
      //Verify the headquarters was updated with the new branch
      const hqResponse = await request(app)
        .get('/v1/swift-codes/MIDLGB22XXX')
        .expect(200);
        
      expect(hqResponse.body.branches).toContainEqual(
        expect.objectContaining({
          swiftCode: 'MIDLGB22LCB'
        })
      );
    });

    it('should reject a headquarters SWIFT code that does not end with XXX', async () => {
      const invalidHQ = {
        address: '1 Churchill Place, London E14 5HP',
        bankName: 'Barclays Bank',
        countryISO2: 'GB',
        countryName: 'United Kingdom',
        isHeadquarter: true,
        swiftCode: 'BARCGB22'  //missing XXX
      };

      const response = await request(app)
        .post('/v1/swift-codes')
        .send(invalidHQ)
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Headquarters SWIFT codes must end with XXX.');
    });

    it('should reject when a required field is missing', async () => {
      const incompleteData = {
        address: '1 Canada Square, London E14 5AB',
        //missing bankName field
        countryISO2: 'GB',
        countryName: 'United Kingdom',
        isHeadquarter: false,
        swiftCode: 'CITIGB2LXXX'
      };

      const response = await request(app)
        .post('/v1/swift-codes')
        .send(incompleteData)
        .expect(400);

      expect(response.body.message).toContain('Missing required fields');
    });

    it('should reject a duplicate SWIFT code', async () => {
      //try to add an existing SWIFT code
      const duplicateSwiftCode = {
        address: '383 Madison Ave, New York, NY 10017',
        bankName: 'JPMorgan Chase Bank',
        countryISO2: 'US',
        countryName: 'UNITED STATES',
        isHeadquarter: true,
        swiftCode: 'CHASUS33XXX'  //already exists in the database
      };

      const response = await request(app)
        .post('/v1/swift-codes')
        .send(duplicateSwiftCode)
        .expect(409);

      expect(response.body.message).toContain('already exists in the database');
    });
  });

  // // //  Endpoint 4: DELETE /v1/swift-codes/{swift-code} // // // 
  describe('DELETE /v1/swift-codes/{swift-code}', () => {
    it('should successfully delete a branch SWIFT code and update its headquarters', async () => {
      const response = await request(app)
        .delete('/v1/swift-codes/DEUTDEFFBER')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Successfully deleted SWIFT code DEUTDEFFBER');
      
      //verify the code was deleted
      const verifyResponse = await request(app)
        .get('/v1/swift-codes/DEUTDEFFBER')
        .expect(404);
        
      //verify headquarters was updated
      const hqResponse = await request(app)
        .get('/v1/swift-codes/DEUTDEFFXXX')
        .expect(200);
        
      //should no longer have the deleted branch
      const hasBranch = hqResponse.body.branches.some(
        (branch: any) => branch.swiftCode === 'DEUTDEFFBER'
      );
      expect(hasBranch).toBe(false);
    });

    it('should successfully delete a headquarters SWIFT code', async () => {
      const response = await request(app)
        .delete('/v1/swift-codes/DEUTDEFFXXX')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Successfully deleted SWIFT code DEUTDEFFXXX');
      
      //verify the code was deleted
      const verifyResponse = await request(app)
        .get('/v1/swift-codes/DEUTDEFFXXX')
        .expect(404);
    });

    it('should return 404 when trying to delete a non-existent SWIFT code', async () => {
      const response = await request(app)
        .delete('/v1/swift-codes/NONEXISTENT')
        .expect(404);

      expect(response.body).toHaveProperty('message', 'SWIFT code NONEXISTENT not found in the database');
    });
  });

  //test router
  describe('Route behavior', () => {
    it('should handle the base route correctly', async () => {
      const response = await request(app)
        .get('/v1/swift-codes')
        .expect(200);

      expect(response.text).toBe("Hey, it's swift functions");
    });

    it('should handle the test endpoint correctly', async () => {
      const response = await request(app)
        .get('/v1/swift-codes/test/test-string')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Test endpoint successful {test-string}');
    });
  });

  // // // Advanced integration tests // // //
  describe('Integration tests', () => {
    it('should handle the full lifecycle: add, query, and delete a SWIFT code', async () => {
      // 1. Add a new SWIFT code
      const newBank = {
        address: '100 Queen Street, Melbourne VIC 3000',
        bankName: 'Australia and New Zealand Banking Group',
        countryISO2: 'AU',
        countryName: 'Australia',
        isHeadquarter: true,
        swiftCode: 'ANZBAU3MXXX'
      };
      
      await request(app)
        .post('/v1/swift-codes')
        .send(newBank)
        .expect(201);
      
      // 2. Add a branch for this bank
      const newBranch = {
        address: '242 Pitt Street, Sydney NSW 2000',
        bankName: 'Australia and New Zealand Banking Group - Sydney Branch',
        countryISO2: 'AU',
        countryName: 'Australia',
        isHeadquarter: false,
        swiftCode: 'ANZBAU3MSYD'
      };
      
      await request(app)
        .post('/v1/swift-codes')
        .send(newBranch)
        .expect(201);
      
      // 3. Query by country
      const countryResponse = await request(app)
        .get('/v1/swift-codes/country/AU')
        .expect(200);
        
      expect(countryResponse.body.swiftCodes).toHaveLength(2);
      
      // 4. Query the headquarters
      const hqResponse = await request(app)
        .get('/v1/swift-codes/ANZBAU3MXXX')
        .expect(200);
        
      expect(hqResponse.body.branches).toHaveLength(1);
      expect(hqResponse.body.branches[0].swiftCode).toBe('ANZBAU3MSYD');
      
      // 5. Delete the branch
      await request(app)
        .delete('/v1/swift-codes/ANZBAU3MSYD')
        .expect(200);
        
      // 6. Verify the branch was removed from headquarters
      const updatedHqResponse = await request(app)
        .get('/v1/swift-codes/ANZBAU3MXXX')
        .expect(200);
        
      expect(updatedHqResponse.body.branches).toHaveLength(0);
      
      // 7. Delete the headquarters
      await request(app)
        .delete('/v1/swift-codes/ANZBAU3MXXX')
        .expect(200);
        
      // 8. Verify the country no longer has any SWIFT codes
      const finalCountryResponse = await request(app)
        .get('/v1/swift-codes/country/AU')
        .expect(404);
    });

    it('should handle edge cases with special characters in SWIFT codes', async () => {
      //SWIFT code with special characters in name
      const specialBank = {
        address: 'Rue de la Banque 9, 1000 Brussels',
        bankName: 'Bank & Trust (Europe) S.A.',
        countryISO2: 'BE',
        countryName: 'Belgium',
        isHeadquarter: true,
        swiftCode: 'BTRSBE22XXX'
      };
      
      await request(app)
        .post('/v1/swift-codes')
        .send(specialBank)
        .expect(201);
        
      const response = await request(app)
        .get('/v1/swift-codes/BTRSBE22XXX')
        .expect(200);
        
      expect(response.body.bankName).toBe('Bank & Trust (Europe) S.A.');
    });

    it('should correctly handle concurrent operations', async () => {
      const concurrentBank = {
        address: 'Via Roma 1, 00184 Rome',
        bankName: 'Banca Nazionale del Lavoro',
        countryISO2: 'IT',
        countryName: 'Italy',
        isHeadquarter: true,
        swiftCode: 'BNLIITRRXXX'
      };
      
      await request(app)
        .post('/v1/swift-codes')
        .send(concurrentBank)
        .expect(201);
      
      //execute concurrent operations
      const branchPromises = ['ROM', 'MIL', 'NAP'].map(city => {
        const branch = {
          address: `Via ${city} 123, Italy`,
          bankName: `Banca Nazionale del Lavoro - ${city} Branch`,
          countryISO2: 'IT',
          countryName: 'Italy',
          isHeadquarter: false,
          swiftCode: `BNLIITRR${city}`
        };
        
        return request(app)
          .post('/v1/swift-codes')
          .send(branch);
      });
      
      const results = await Promise.all(branchPromises);
      results.forEach(res => expect(res.status).toBe(201));
      
      //verify all branches were added to the headquarters
      const hqResponse = await request(app)
        .get('/v1/swift-codes/BNLIITRRXXX')
        .expect(200);
        
      expect(hqResponse.body.branches).toHaveLength(3);
    });
  });

  // // // Edge case tests // // //
  describe('Edge cases', () => {
    it('should handle malformed SWIFT codes gracefully', async () => {
      //code too short
      const response1 = await request(app)
        .get('/v1/swift-codes/ABC')
        .expect(404);
        
      //code with invalid characters
      const response2 = await request(app)
        .get('/v1/swift-codes/INVALID!CODE')
        .expect(404);
    });

    it('should sanitize and normalize inputs', async () => {
      //lowercase and extra whitespace
      const newBank = {
        address: '  Plaza de la Lealtad, 1, 28014 Madrid  ',
        bankName: '  banco santander  ',
        countryISO2: '  es  ',
        countryName: '  spain  ',
        isHeadquarter: true,
        swiftCode: '  bschesmmxxx  '
      };
      
      await request(app)
        .post('/v1/swift-codes')
        .send(newBank)
        .expect(201);
        
      //verify if it was normalized
      const response = await request(app)
        .get('/v1/swift-codes/BSCHESMMXXX')  
        .expect(200);
        
      expect(response.body.countryISO2).toBe('ES');
      expect(response.body.countryName).toBe('SPAIN');
    });
  });
});