import 'react-native-get-random-values';

// Pre-compute hex strings from 0 to 255
const LUT: string[] = [];
for (let i = 0; i < 256; i++) {
    LUT[i] = i.toString(16).padStart(2, '0');
}

export const generateUUID = (): string => {
    const rnds = new Uint8Array(16);
    crypto.getRandomValues(rnds);

    // Set version 4 and variant bits
    rnds[6] = (rnds[6] & 0x0f) | 0x40;
    rnds[8] = (rnds[8] & 0x3f) | 0x80;

    // Faster lookup instead of .map().toString()
    return (
        LUT[rnds[0]] + LUT[rnds[1]] + LUT[rnds[2]] + LUT[rnds[3]] + '-' +
        LUT[rnds[4]] + LUT[rnds[5]] + '-' +
        LUT[rnds[6]] + LUT[rnds[7]] + '-' +
        LUT[rnds[8]] + LUT[rnds[9]] + '-' +
        LUT[rnds[10]] + LUT[rnds[11]] + LUT[rnds[12]] + LUT[rnds[13]] + LUT[rnds[14]] + LUT[rnds[15]]
    );
};

/**
 * Validates if a string is a valid UUID v4.
 * format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx 
 * where y is 8, 9, a, or b.
 */
export const isUUID = (uuid: string): boolean => {
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidV4Regex.test(uuid);
};