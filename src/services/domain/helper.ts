// Helper to split array into smaller pieces
export const chunkArray = <T>(array: T[], size: number): T[][] => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
};