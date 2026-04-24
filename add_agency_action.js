const fs = require('fs');
let c = fs.readFileSync('src/app/actions.ts', 'utf8');

if (!c.includes('export async function createNewAgencyAction')) {
    const importStr = "createAgency,";
    c = c.replace(/import \{/, "import {\n    createAgency,\n");
    
    const actionStr = `
export async function createNewAgencyAction(name: string, phone: string, planType: string): Promise<{ success: boolean; error?: string }> {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'super_admin') {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await createAgency(name, phone, planType);
        revalidatePath('/super-admin');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
`;
    c += actionStr;
    fs.writeFileSync('src/app/actions.ts', c);
    console.log("Added createNewAgencyAction");
}
