import { prisma } from './lib/prisma';

async function main() {
    const scale = await prisma.scale.findFirst();
    console.log('Scale:', scale);

    if (!scale) {
        console.log('No scale found. Creating one...');
        const warehouse = await prisma.warehouse.findFirst();
        if (!warehouse) {
            console.log('No warehouse found. Cannot create scale.');
            return;
        }
        const newScale = await prisma.scale.create({
            data: {
                name: 'Test Scale',
                apiKey: 'test_api_key',
                warehouseId: warehouse.id
            }
        });
        console.log('Created Scale:', newScale);
        console.log(`Command to test:\ncurl -X POST http://localhost:3000/api/v1/scales/${newScale.id}/weight -H "Authorization: Bearer test_api_key" -H "Content-Type: text/plain" -d "1500"`);
    } else {
        console.log(`Command to test:\ncurl -X POST http://localhost:3000/api/v1/scales/${scale.id}/weight -H "Authorization: Bearer ${scale.apiKey}" -H "Content-Type: text/plain" -d "1500"`);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
