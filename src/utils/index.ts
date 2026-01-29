import { CONFIG } from "@constants/config";

// Helper to split array into smaller pieces
export const chunkArray = <T>(array: T[], size: number = CONFIG.CHUNK_SIZE): T[][] => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
};